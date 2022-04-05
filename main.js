var interval = setInterval(function() {
    update();
}, 100);

const scoreLabels = ["Makym", "Horrible", "Very Bad", "Bad", "Average", "Fine", "Good", "Very Good", "Great", "Masterpiece"];

function update() {
    let sliderValue = document.getElementById("inputSlider").value;
    document.getElementById("sliderLabel").innerHTML = sliderValue + " " + scoreLabels[sliderValue-1];
}