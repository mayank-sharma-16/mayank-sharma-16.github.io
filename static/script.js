
window.onload = function() {

    var title_card = this.document.getElementById('title_card');
    var footer = this.document.getElementById('footer');
    var footer_subsections = this.document.getElementsByClassName('footer_subsection');
    title_card.style.marginTop = 0;

    opacity_delay_helper(title_card, 0.1, 7);
    slight_downlift_helper(title_card, 20);

    opacity_delay_helper(footer, 0.1, 7);
    slight_uplift_helper(footer);

    var about_me_activated = false;

    this.document.addEventListener("mousemove", function(event){
        console.log("mouse" + event.pageX.toString() + " " + event.pageY.toString());
    });

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
            return;
        }
        initial_margin += Math.max((0.75 - acceleration),0.18);
        acceleration = acceleration+0.0032;
        element.style.marginTop = initial_margin.toString() + "vh";
    }, time);   
};

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
            about_word_helper();
            return;
        }
        initial_width += Math.max((0.75 - acceleration), 0.12);
        acceleration = acceleration+0.0045;
        element.style.width = initial_width.toString() + "vw";
    }, time);
};


var about_word_helper = function(element, time){
    var words = document.getElementById('left_panel').getElementsByTagName('p');
    
    for(var i = 0; i < words.length; i++){
        opacity_delay_helper(words[i], 0, 1);
    }

    populate_soup(window.document.getElementById('about_soup'));

};

var random_bounded_coordinates = function(rect){
    var x_min = rect["left"];
    var x_max = rect["right"];

    var y_min = rect["top"];
    var y_max = rect["bottom"];

    return [Math.random() * x_max * 0.5, Math.random() * y_max *0.5]; 

};

var populate_soup = function(element){
    var word_list = [
        'Python', 'C++', 'Machine Learning', 'Neural Networks',
        'Video Games', 'Unity', 'Cooking', 'Taco Bell',
        'Arrested Development', 'Hamilton', 'UC Irvine',
        'HP Lovecraft', 'Dark Souls', 'Bloodborne'];

    window.document.getElementById('about_soup').style.display = "initial";

    for(var i = 0; i < word_list.length; i++){
        element.insertAdjacentHTML("afterbegin", "<div class='soup_word' id='about_soup" + 
                                    i + "'><p>" + word_list[i] + "</p></div>");
    }

    var word_count = 0;

    var timer = setInterval(function(){
        if(word_count >= word_list.length){
            clearInterval(timer);
            return;
        }
        
        var word_element = window.document.getElementById('about_soup' + word_count.toString());
        var initial = random_bounded_coordinates(element.getBoundingClientRect());

        word_element.style.left = initial[0].toString() + 'px';
        word_element.style.top = initial[1].toString() + 'px';

        var fixed_total = 10;

        var random_horizontal_velocity = Math.random() + 1;
        var random_vertical_velocity = Math.sqrt(fixed_total - random_horizontal_velocity**2);

        if (Math.random() >= 0.5){
            random_horizontal_velocity *= -1;
        }
        if (Math.random() >= 0.5){
            random_vertical_velocity *= -1;
        }

        console.log(random_horizontal_velocity.toString() + " " + random_vertical_velocity.toString());
        //console.log(word_element.innerText + " " + word_element.style.left.toString() + " " + word_element.style.top.toString());

        opacity_delay_helper(word_element, 0.05, 10);
        setTimeout(function(){
            add_velocity(word_element, random_vertical_velocity, random_horizontal_velocity, -1);
        }, 500);
        word_count += 1;

    }, 1000);
};

var add_velocity = function(element, vertical, horizontal, ticks){
    var timer = setInterval(function(){
        if(ticks != -1 && ticks <= 0){
            clearInterval(timer);
        }
        add_velocity_unit(element, vertical, horizontal, timer);

        if(boundary_check(element, element.parentElement)[0] == -1){
            horizontal = -1*horizontal;
        }
        
        if(boundary_check(element, element.parentElement)[1] == -1){
            vertical = -1*vertical;
        }

    },15);
};

var add_velocity_unit = function(element, vertical, horizontal, timer){

    var r_y = window.getComputedStyle(element).getPropertyValue("top");
    var r_x = window.getComputedStyle(element).getPropertyValue("left");

    var i_y = parseInt(r_y.substring(0,r_y.length-2));
    var i_x = parseInt(r_x.substring(0,r_x.length-2));

    element.style.top = (i_y + vertical).toString() + "px";
    element.style.left = (i_x + horizontal).toString() + "px";

};

var boundary_check = function(element, bounding_element){
    var element_rect = element.getBoundingClientRect();
    var bounding_rect = bounding_element.getBoundingClientRect();

    var results = []

    if(element_rect["left"] <= bounding_rect["left"] 
        || element_rect["right"] >= bounding_rect["right"]){
        results.push(-1);
    }
    else{
        results.push(1);
    }

    if(element_rect["top"] <= bounding_rect["top"] 
        || element_rect["bottom"] >= bounding_rect["bottom"]){
        results.push(-1);
    }
    else{
        results.push(1);
    }
    
    return results;

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
};

var slight_downlift_helper = function(element, margin) {

    var ideal_shift_margin = margin;
    var completed_shift_margin = 0;
    
    var timer = setInterval(function (){
        if (completed_shift_margin == ideal_shift_margin){
            clearInterval(timer);
        }
        completed_shift_margin += 1;
        element.style.marginTop = completed_shift_margin.toString() + 'px';
    }, 30);
};

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