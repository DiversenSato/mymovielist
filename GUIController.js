class GUIController {
  constructor() {
     this.elements = [];
  }
  
  addSlider() {
    let newSlider = new Slider();
    newSlider.zLayer = this.elements.length;
    append(this.elements, newSlider);
    
    return newSlider;
  }
  
  addButton(f) {
    let newButton = new Button(f);
    newButton.zLayer = this.elements.length;
    append(this.elements, newButton);
    
    return newButton;
  }
  
  update() {
    for (let i = 0; i < this.elements.length; i++) {
      this.elements[i].update();
    }
  }
  
  show() {
    for (let i = 0; i < this.elements.length; i++) {
      this.elements[i].show();
    }
  }
  
  mousePressed() {
    let topElement = this.elements[0];
    for (let i = 0; i < this.elements.length; i++) {
      if (this.elements[i].mouseInBounds()) {
        if (this.elements[i].zLayer > topElement.zLayer) {
          topElement = this.elements[i];
        }
      }
    }
    
    if (topElement == null) {
      return;
    }
    
    topElement.mousePressed();
  }
}