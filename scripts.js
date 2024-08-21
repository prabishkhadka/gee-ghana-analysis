// Load Ghana boundary as a feature
var ghana = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
  .filter(ee.Filter.eq('country_na', 'Ghana'));

// Define Accra area of interest
var accra = /* define your area of interest */;

// Load Landsat 9 Collection
var L9_Col = ee.ImageCollection("LANDSAT/LC09/C02/T1_TOA")
              .filterDate('2022-05-02', '2022-10-01')
              .filterBounds(accra);

print(L9_Col);

// Function to mask cloud from Landsat 9 Collection
var GetQABits = function(image, start, end, newName) {
  var pattern = 0;
  for (var i = start; i <= end; i++) {
    pattern += Math.pow(2, i);
  }
  return image.select([0], [newName])
            .bitwiseAnd(pattern).rightShift(start);
};

// Function for cloud and cloud shadows
var cloudPixels = function(image) {
  var QA = image.select(['QA_PIXEL']);
  return GetQABits(QA, 3, 4, 'cloud').eq(0);
};

var cloud_confidence = function(image) {
  var QA = image.select(['QA_PIXEL']);
  return GetQABits(QA, 10, 11, 'cloud_shadow').eq(1);
};

var maskL9clouds = function(image) {
  var cp = cloudPixels(image);
  var cc = cloud_confidence(image);
  image = image.updateMask(cp);
  return image.updateMask(cc);
};

// Reduce image by mean
var L9unmasked = L9_Col.mean();
var mosaic_free_accra = L9_Col.map(maskL9clouds).mean().clip(accra);

Map.centerObject(ghana, 7);
Map.addLayer(L9unmasked, imageVisParam, 'Ghana_2022_image', 0);
Map.addLayer(mosaic_free_accra, imageVisParam2, 'MaskedGhana_2022_image', 1);

var styling = {color: 'red', fillColor: '00000000'};
Map.addLayer(accra.style(styling));

// Water analysis
var waterBands = ['B3', 'B6'];
var waterImage = mosaic_free_accra.select(waterBands);
var ndwi = waterImage.normalizedDifference(waterBands);
var waterMask = ndwi.gt(0);
var waterOnly = waterImage.updateMask(waterMask);
var waterPalette = ['0000FF'];
Map.addLayer(waterOnly, {min: 0, max: 0.3, bands: waterBands}, 'Water areas', false);

// Vegetation analysis
var vegetationBands = ['B5', 'B4', 'B2'];
var vegetationImage = mosaic_free_accra.select(vegetationBands);
var ndvi = vegetationImage.normalizedDifference(['B5', 'B4']);
var vegetationMask = ndvi.gt(0.2);
var ndviPalette = ['8B0000', 'DC143C', 'F88379', 'CC7722', 'FFA500', 'yellow', 'green'];
Map.addLayer(ndvi, {min: 0, max: 1, palette: ndviPalette}, 'NDVI');
var vegetationOnly = vegetationImage.updateMask(vegetationMask);
Map.addLayer(vegetationOnly, {min: 0.05, max: 0.5, bands: vegetationBands}, 'Vegetation areas', false);

// Classification
var training = tWater.merge(tVegetation).merge(tUrban).merge(tCultivation).merge(tBarren).merge(tGrassLand);
var label = 'landcover';
var bands = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7'];
var input = mosaic_free_accra.select(bands);
var trainImage = input.sampleRegions({
  collection: training,
  properties: [label],
  scale: 30
});
var trainingData = trainImage.randomColumn();
var trainset = trainingData.filter(ee.Filter.lessThan('random', 0.8));
var testset = trainingData.filter(ee.Filter.greaterThanOrEquals('random', 0.2));
var classifier = ee.Classifier.smileRandomForest(10).train(trainset, label, bands);
var classified = input.classify(classifier);
var landcoverPalette = ['0000FF', '00FF00', 'FF0000', 'FFFF00', 'FFA500', '90EE90'];
Map.addLayer(classified, {palette: landcoverPalette, min: 0, max: 5}, 'classification');
var confusionMatrix = ee.ConfusionMatrix(testset.classify(classifier).errorMatrix({
  actual: 'landcover',
  predicted: 'classification'
}));
print('Confusion Matrix:', confusionMatrix);
print('Overall Accuracy:', confusionMatrix.accuracy());

// Export classified image
Export.image.toDrive({
  image: classified,
  description: 'classification',
  folder: 'LULC',
  scale: 30,
  region: accra,
});

// Legend and title
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});
var legendTitle = ui.Label({
  value: 'Classification',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});
legend.add(legendTitle);
var makeRow = function(color, name) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: '#' + color,
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });
  var description = ui.Label({
    value: name,
    style: {margin: '0 0 4px 6px'}
  });
  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};
var palette = ['103bd6', '08b955', 'f02c1f', 'ffc82d', 'ffc9ff', 'b4ffad'];
var names = ['Water', 'Vegetation', 'Urban', 'Cultivation', 'BarrenLand', 'GrassLand'];
for (var i = 0; i < 6; i++) {
  legend.add(makeRow(palette[i], names[i]));
}
Map.add(legend);
var title = ui.Label('Land Cover Landuse Classification Map of Accra, 2022');
title.style().set('position', 'top-center');
Map.add(title);
var title = ui.Label('Prepared by: Prabish Khadka Chhetri, JSU');
title.style().set('position', 'bottom-right');
Map.add(title);

// Area Calculation in sq. km
var classArea = function(image) {
  var areaImage = ee.Image.pixelArea().addBands(image);
  var areas = areaImage.reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'landcover',
    }),
    geometry: accra,
    scale: 20,
    maxPixels: 1e8
  });
  var classAreas = ee.List(areas.get('groups'));
  var classAreaLists = classAreas.map(function(item) {
    var areaDict = ee.Dictionary(item);
    var classNumber = ee.Number(areaDict.get('landcover')).format();
    var area = ee.Number(areaDict.get('sum')).divide(1e6).round();
    return ee.List([classNumber, area]);
  });
  var result = ee.Dictionary(classAreaLists.flatten());
  return(result);
};
print('Area in sq.km:', classArea(classified));

// Visualization in Graph
var classNames = ['Water', 'Vegetation', 'BuiltUp', 'Cultivated', 'Barren', 'Grassland'];
var create_chart = function(classified, aoi, classNames) {
  var options = {
    hAxis: {title: 'Land Cover Class'},
    vAxis: {title: 'Area in sq. meters'},
    title: 'Area in sq. meters by Land Cover Class',
    series: {
      0: {color: 'blue'},
      1: {color: 'green'},
      2: {color: 'red'},
      3: {color: 'yellow'},
      4: {color: 'pink'},
      5: {color: 'grey'}
    }
  };
  var areaChart = ui.Chart.image.byClass({
    image: ee.Image.pixelArea().addBands(classified),
    classBand: 'classification',
    scale: 20,
    region: accra,
    reducer: ee.Reducer.sum()
  }).setSeriesNames(classNames)
    .setOptions(options);
  print(areaChart);
};
create_chart(classified.divide(1000000), accra, classNames);
