export { gradual_load_text, instant_display_elements, gradual_display_elements }

var gradual_load_text = function(element, text){
    console.log('WORKING on');
    console.log(text);
    return new Promise(
        (resolve) => gradual_load_helper(element, text, resolve)
        //function(resolve){
        //gradual_load_helper(element,text, resolve);
    //}
    )
}

var gradual_load_helper = function(element, text, resolve){
    var i = 0;
    var showfull = function(){
        setTimeout(function(){
            i++;
            if (i < text.length){
                element.innerText = text.substring(0,i).concat('\u2592') ;
                showfull();
            }
            if (i == text.length){
                element.innerText = text.substring(0, text.length);
                resolve();
            }
        }, 50);
    }
    showfull();
}

var instant_display_elements = function(elements, new_style){
    return new Promise(function(resolve){
        instant_display_elements_helper(elements, new_style, resolve);
    })
}

var instant_display_elements_helper = function(elements, new_style, resolve){
    var i = 0;
    while (i < elements.length){
        elements[i].style.display = "initial";
        i++
    }
    resolve();
}

var gradual_display_elements = function(elements, new_style){
    return new Promise(function(resolve){
        gradual_display_elements_helper(elements, new_style, resolve);
    })
}

var gradual_display_elements_helper = function(elements, new_style, resolve){
    var j = 0;
    var timer = setInterval(function(){
        elements[j].style.display = new_style;
        j++;
        if (j == elements.length){
            clearInterval(timer);
            resolve();
        }
    }, 200);
}