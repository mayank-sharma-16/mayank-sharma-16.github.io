
window.onload = function() {

    var title_card = this.document.getElementById('title_card');
    var footer = this.document.getElementById('footer');
    var footer_subsections = this.document.getElementsByClassName('footer_subsection');
    title_card.style.marginTop = 0;

    opacity_delay_helper(title_card, 0.1);
    slight_downlift_helper(title_card);

    opacity_delay_helper(footer, 0.1);
    slight_uplift_helper(footer);

    /*footer_subsections[0].addEventListener("mouseover", function(event){
        footer_subsections[0].style.height = "20vh";
        footer_subsections[0].style.marginTop= "-20px";
        footer_subsections[0].style.marginBottom = "20px";
        footer_subsections[0].style.position = "absolute";
    });*/

};

var slight_uplift_helper = function(element) {

    var ideal_shift_margin = -18;
    var completed_shift_margin = 0;
    
    var timer = setInterval(function (){
        if (completed_shift_margin == ideal_shift_margin){
            clearInterval(timer);
        }
        completed_shift_margin -= 1;
        element.style.marginTop = completed_shift_margin.toString() + 'px';
    }, 30);
}

var slight_downlift_helper = function(element) {

    var ideal_shift_margin = 20;
    var completed_shift_margin = 0;
    
    var timer = setInterval(function (){
        if (completed_shift_margin == ideal_shift_margin){
            clearInterval(timer);
        }
        completed_shift_margin += 1;
        element.style.marginTop = completed_shift_margin.toString() + 'px';
    }, 30);
}

var opacity_delay_helper = function(element, op) {

    var timer = setInterval(function () {
        if (op >= 1){
            clearInterval(timer);
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op += 0.005;
    }, 10);
    
};