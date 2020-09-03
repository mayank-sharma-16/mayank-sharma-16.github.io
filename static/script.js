
window.onload = function() {

    var title_card = this.document.getElementById('title_card');
    var footer = this.document.getElementById('footer');
    var footer_subsections = this.document.getElementsByClassName('footer_subsection');
    title_card.style.marginTop = 0;

    opacity_delay_helper(title_card, 0.1, 7);
    slight_downlift_helper(title_card);

    opacity_delay_helper(footer, 0.1, 7);
    slight_uplift_helper(footer);

    var about_me_activated = false;

    footer_subsections[0].addEventListener("click", function(element){
        
        if(about_me_activated == false){
            element = document.getElementById("hidden_body");
            opacity_delay_helper(element, 0.1, 1);
            expand_helper(element, 2);
            about_me_activated = true;
        }
        else{
            element = document.getElementById("hidden_body");
            collapse_helper(element, 0.1);
            about_me_activated = false;
        }
    });

};

var collapse_helper = function(element, time){

    var initial_width = 99.6;
    var acceleration = 0.01;

    var timer = setInterval(function (){
        if (initial_width <= 33.065){
            element.style.width = "33vw";
            collapse_second_helper(element, time);
            clearInterval(timer);
            return;
        }
        initial_width -= Math.max((0.75 - acceleration), 0.12);
        console.log(element.style.width);
        acceleration = acceleration+0.0045;
        element.style.width = initial_width.toString() + "vw";
    }, time);
};

var collapse_second_helper = function(element, time){
    var initial_margin = 0.1;
    var acceleration = 0.01;

    var timer = setInterval(function (){
        if (initial_margin >= 90){
            clearInterval(timer);
            expand_second_helper(element, time);
            return;
        }
        initial_margin += Math.max((0.75 - acceleration),0.18);
        acceleration = acceleration+0.0032;
        element.style.marginTop = initial_margin.toString() + "vh";
    }, time);   
}

var expand_helper = function(element, time){

    var initial_margin = 90;
    var acceleration = 0.01;

    var timer = setInterval(function (){
        if (initial_margin <= 1){
            clearInterval(timer);
            expand_second_helper(element, time);
        }
        initial_margin -= Math.max((0.75 - acceleration),0.18);
        acceleration = acceleration+0.0032;
        element.style.marginTop = initial_margin.toString() + "vh";
    }, time);
    
};

var expand_second_helper = function(element, time){

    var initial_width = 33;
    var acceleration = 0.01;

    var timer = setInterval(function (){
        if (initial_width >= 99.6){
            clearInterval(timer);
            return;
        }
        initial_width += Math.max((0.75 - acceleration), 0.12);
        acceleration = acceleration+0.0045;
        element.style.width = initial_width.toString() + "vw";
    }, time);
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

var opacity_delay_helper = function(element, op, time) {

    var timer = setInterval(function () {
        if (op >= 1){
            clearInterval(timer);
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op += 0.005;
    }, time);
    
};