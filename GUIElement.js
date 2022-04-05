class GUIElement {
  constructor() {
    this.position = createVector(0, 0);
    this.dimension = createVector(100, 10);

    this.zLayer = 0;

    this.isHeld = false;
    this.visible = true;
  }
  
  mouseInBounds() {
    return mouseX > this.position.x && mouseX < this.position.x+this.dimension.x && mouseY > this.position.y && mouseY < this.position.y+this.dimension.y;
  }
}

class Button extends GUIElement {
  constructor(f) {
    super();
    
    this.backgroundColor = color(90);
    this.highlightColor = color(130);
    this.pressedColor = color(170);
    
    this.func = f;
    this.mouseOver = false;
  }
  
  setPosition(x, y) {
    this.position.x = x;
    this.position.y = y;
    
    return this;
  }
  
  setSize(w, h) {
    this.dimension.x = w;
    this.dimension.y = h;
    
    return this;
  }
  
  
  
  update() {
    this.mouseOver = this.mouseInBounds();
    
    if (!mouseIsPressed && this.isHeld) {
      //Gets executed when mouse is released
      this.isHeld = false;
      
      if (this.mouseOver) {
        //Mouse is inside button when released.
        //Call attached function.
        this.func();
      }
    }
  }
  
  mousePressed() {
    this.isHeld = true;
  }
  
  show() {
    if (!this.visible) {
      return;
    }
    
    rectMode(CORNER);
    noStroke();
    if (this.isHeld) {
      fill(this.pressedColor);
    } else if (this.mouseOver) {
      fill(this.highlightColor);
    } else {
      fill(this.backgroundColor);
    }
    
    rect(this.position.x, this.position.y, this.dimension.x, this.dimension.y);
  }
}

class Slider extends GUIElement {
  constructor() {
    super();
    
    this.minValue = 0;
    this.maxValue = 10;
    this.value = 0;

    this.mousePressedXPosition = 0;
    this.mousePressedYPosition = 0;
    this.sliderHeldStartValue = 0;

    this.showText = true;

    this.sliderType = 0; //Refers to this slider being horizontal or vertical.

    this.backgroundColor = color(90);
    this.sliderColor = color(130);
    this.pressedColor = color(170);

    //Constants
    this.HORIZONTAL = 0;
    this.VERTICAL = 1;
  }
  
  
  
  getValue() {
    return this.value;
  }
  
  getMinValue() {
    return this.minValue;
  }
  
  getMaxValue() {
    return this.maxValue;
  }
  
  mousePressed() {
    this.isHeld = true;
    this.mousePressedXPosition = mouseX;
    this.mousePressedYPosition = mouseY;
    this.sliderHeldStartValue = this.value;
  }

  update() {
    if (!mouseIsPressed) {
      this.isHeld = false;
    }

    if (this.isHeld) {
      if (this.sliderType == this.HORIZONTAL) {
        this.value = min(max(this.minValue, map(map(this.sliderHeldStartValue, this.minValue, this.maxValue, 0, this.dimension.x) + this.position.x + mouseX - this.mousePressedXPosition, this.position.x, this.position.x + this.dimension.x, this.minValue, this.maxValue)), this.maxValue);
      } else if (this.sliderType == this.VERTICAL) {
        this.value = min(max(this.minValue, map(map(this.sliderHeldStartValue, this.minValue, this.maxValue, this.dimension.y, 0) + this.position.y + mouseY - this.mousePressedYPosition, this.position.y, this.position.y + this.dimension.y, this.maxValue, this.minValue)), this.maxValue);
      }
    }
  }

  setPosition(x, y) {
    this.position.x = x;
    this.position.y = y;
    
    return this;
  }

  setSize(w, h) {
    this.dimension.x = w;
    this.dimension.y = h;
    
    return this;
  }
  
  setTextVisibility(visibility) {
    this.showText = visibility;
    
    return this;
  }
  
  setHorizontal() {
    this.sliderType = this.HORIZONTAL;
    
    return this;
  }
  
  setVertical() {
    this.sliderType = this.VERTICAL;
    
    return this;
  }
  
  setRange(m, M) {
    this.minValue = min(m, M);
    this.maxValue = max(m, M);
    
    if (this.value < this.minValue) {
      this.value = this.minValue;
    }
    
    return this;
  }
  
  isHeld() {
    return this.isHeld;
  }
  
  show() {
    if (!this.visible) {
      return;
    }
    
    noStroke();
    fill(this.backgroundColor);
    rectMode(CORNER);
    rect(this.position.x, this.position.y, this.dimension.x, this.dimension.y);



    fill(this.sliderColor);
    if (this.isHeld) {
      fill(this.pressedColor);
    }
    //I have no idea what to call this variable. It's like a pointer to where the sliders value is in the canvas I suppose
    let valuePointer = 0;
    if (this.sliderType == this.HORIZONTAL) {
      valuePointer = map(this.value, this.minValue, this.maxValue, 0, this.dimension.x);
      rect(this.position.x, this.position.y, valuePointer, this.dimension.y);
    } else if (this.sliderType == this.VERTICAL) {
      valuePointer = map(this.value, this.minValue, this.maxValue, this.dimension.y, 0);
      rect(this.position.x, this.position.y+this.dimension.y, this.dimension.x, valuePointer-this.dimension.y);
    }
    
    
    
    if (this.showText) {
      fill(255);
      textSize(30);
      let formattedValue = this.value.toFixed(2);
      let textW = textWidth(formattedValue)
      
      if (this.sliderType == this.HORIZONTAL) {
        text(formattedValue, min(valuePointer, this.dimension.x - textW-4) + this.position.x, this.position.y + this.dimension.y-4);
      } else if (this.sliderType == this.VERTICAL) {
        text(formattedValue, this.position.x, valuePointer + this.position.y);
      }
    }
  }
}