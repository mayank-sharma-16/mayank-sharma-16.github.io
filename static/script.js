import {gradual_load_text, gradual_display_elements, instant_display_elements} from "./displays.js" 

window.onload = function() {

    var complete_title = "MAYANK_SHARMA$ ls portfolio";
    var title_element = document.getElementById('title').getElementsByTagName('h1')[0];

    var table_of_contents = document.getElementById('table-of-contents').getElementsByTagName('li');

    var subsection_list = document.getElementsByClassName('subsection');
    var subsection_titles = []
    for(var i = 0; i < subsection_list.length; i++){
        subsection_titles.push(subsection_list[i].getElementsByClassName('subsection-title'));
    }
    var subsection_titles_text = ["$cat AboutMe.txt", "$ls Projects", "$ls Current Activities"]
    
    var subsection_content = []
    var subsection_headers = [] 
    for(var i = 0; i < subsection_titles.length; i++){
        subsection_headers.push(subsection_titles[i][0].getElementsByTagName('h2')[0]);
        //console.log(subsection_headers[i]);
        subsection_content.push(subsection_list[i].getElementsByClassName('subsection-content')[0]);
    }

    var promise_made = gradual_load_text(title_element,complete_title)
    .then(
        (elements, new_style) => instant_display_elements(table_of_contents, "block") 
        )
    .then(
        (elements, text) => gradual_load_text(subsection_headers[0], subsection_titles_text[0]) 
    )
    .then(
        () => instant_display_elements([subsection_content[0]], "initial")
    )
    .then(
        (elements, text) => gradual_load_text(subsection_headers[1], subsection_titles_text[1]) 
    )
    .then(
        () => instant_display_elements([subsection_content[1]], "initial")
    )
    .then(
        (elements, text) => gradual_load_text(subsection_headers[2], subsection_titles_text[2]) 
    )
    .then(
        () => instant_display_elements([subsection_content[2]], "initial")
    )

    //TODO: get this loop to work :(
    
    /*for(var k = 0; k < subsection_headers.length; k++){
        console.log(subsection_titles_text[k]);
        console.log(typeof subsection_titles_text[k]);
        console.log(typeof "hello");
        promise_made = promise_made.then(
            (elements, text) => gradual_load_text(subsection_headers[k],subsection_titles_text[k])
            /*function(elements, text) { 
                console.log('STARTING')
                console.log(subsection_headers[k]);
                gradual_load_text(subsection_headers[k], "cat aboutme"); 
            }
        )
    }*/

    //a.then(
    //    function(elements, new_style) { gradual_display_elements(subsection_content, "initial") }
    //    );

    //this.gradual_load_text(target_element, complete_title,this.gradual_display_elements, subsection_list);

}