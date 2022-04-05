let GUIC;

let slider;

function setup() {
  createCanvas(800, 800);
  
  GUIC = new GUIController();
  
  slider = GUIC.addSlider().setPosition(50, 50).setSize(300, 300).setRange(182, 873);
  GUIC.addButton(function() {console.log("test");}).setPosition(300, 600).setSize(100, 70);
}

function draw() {
  background(0);
  
  GUIC.update();
  GUIC.show();
}

function mousePressed() {
  GUIC.mousePressed();
}