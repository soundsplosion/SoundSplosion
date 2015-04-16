/* Javascript function for drawing menus in denoto
Use Example:

var nodediv = root.getElementById("something");
createMenu(root, "nodemenu", nodediv, [{caption: "Remove", click: removeNodeFromGraph}], "Node Options", {x: x, y: y}, n);

The obj parameter is not necessary, but is passed to the click and mouseover handlers given in each entry in the options array. If undefined, undefined will be passed.
Handlers need to accept a single object argument, but do not necessarily need to do anything with it. Use IEFEs to return a function that accepts the object argument
and has all other necessary data filled in and pass that as the value for click and mouseover. Neither are required, but an entry without either will just be a line of text.

*/

function createMenu(root, id, parent, options, caption, pos, obj){
  if(typeof root === 'undefined')
    root = document;

  if(typeof pos === 'undefined'){
    pos.x = parseInt(parent.style.right);
    pos.y = parseInt(parent.style.top);
  }

  var deleteMenu = function(){
      var menu = root.getElementById(id);
      if(menu !== null){
        menu.parentNode.removeChild(menu);
      }
    };

  // delete any existing node menus
  deleteMenu();

  var menu = document.createElement("div");
  menu.setAttribute("id", id);
  menu.setAttribute("class", "menu");
  menu.style.left = pos.x + "px";
  menu.style.top = pos.y + "px";
  menu.style.display = "block";
  menu.style.position = "absolute";
  parent.appendChild(menu);

  // remove the menu when the user's mouse has left its listener
  parent.addEventListener("mouseleave", deleteMenu);

  if(typeof caption !== 'undefined' && caption.trim() !== ""){
    var header = document.createElement("div");
    header.setAttribute("class", "menuheader");
    menu.appendChild(header);

    var h3 = document.createElement("h3");
    h3.innerText = caption;
    header.appendChild(h3);
  }

  for(var index in options){
    var option = options[index];

    var div = document.createElement("div");
    div.setAttribute("class", "menuoption");
    div.setAttribute("id", option.id);
    div.innerText = option.caption;
    menu.appendChild(div);
    if(typeof option.click !== 'undefined'){
      div.addEventListener("click", function(o, opt){
        return function(){
          opt.click(o);
          deleteMenu();
        }
      }(obj, option));
    }
    if(typeof option.mouseover !== 'undefined'){
      div.addEventListener("mouseover", function(o, opt){
        return function(){
          opt.mouseover(o);
        }
      }(obj, option));
    }
    if(typeof option.mouseenter !== 'undefined'){
      div.addEventListener("mouseenter", function(o, opt){
        return function(){
          opt.mouseenter(o);
        }
      }(obj, option));
    }
  }

  return menu;
}