//important, pour faire marcher ce .js il faut dans le html:
//<script src="http://d3js.org/d3.v3.min.js"></script>
//<script src="fisheye.js"></script>
//<script src="sankey.js"></script>
//<script src="main.js"></script>


displayEnum = {
  // liens multiples (au lieu d'un arc)
  MULTIPLE_LINKS : 1,
  //largeur des arcs en % de la racine
  LINK_WIDTH_FROM_ROOT : 2,  
  //hauteur des noeuds en pourcentage du noeud père.
  NODE_HEIGHT_FROM_FATHER : 4,
  //Le Zoom fishEye remplace le "mouseOver" sur les noeuds
  FISHEYE_MODE : 8
}

var display = displayEnum.NODE_HEIGHT_FROM_FATHER;// | displayEnum.FISHEYE_MODE;

//val = flag1 | flag3;
//if(val & flag1)

filterEnum = {
  //le noeud n'est pas à mettre en avant
  NO_FILTER : 0,
  //le noeud est sélectionné
  NODE_SELECTION : 1,
  //un passage (affichage) a été effectué
  NODE_SELECTION_PASSED : 2,
  //les noeuds sont enfant de la sélection
  NODE_SELECTION_CHILDREN : 3,
  //noeud sélectionné lors d'une multy-sélection (Ctrl + click)
  NODE_MULTISELECTION : 4
}

colorEnum = {
  //couleur des liens basiques
  BASE : "#9ecae1",
  //enum représentant le noeud sélectionné
  SELECTED : "black",
  //couleur des liens enfant
  CHILD : "green",
  //couleur des liens parent
  PARENT : "blue",
  //couleur des liens entre noeud sélectionné (avec multy-sélection)
  PATH : "yellow"
}

var baseOpacityLink = 0.35;
var baseOpacityNode = 1;
var opacityFilteredLink = 0.2;
var opacityFilteredNode = 0.15;
var baseStrokeWidth = "1px";
var filteredStrokeWidth = "2px";
var overStrokeWidth = "7px";

//paramètre de base.
var units = "Widgets";

var margin = {top: 10, right: 10, bottom: 10, left: 10},
width = (window.innerWidth) - 50 - margin.left - margin.right,
height = (window.innerHeight) - 50 - margin.top - margin.bottom;

var formatNumber = d3.format(",.0f"),    // zero decimal places
format = function(d) { return formatNumber(d) + " " + units; };

//paramètre du Zoom
var startingScreen = [width / 2, height / 2, Math.min(width, height)],
currentScreen = startingScreen,
lastZoom;
//préparation fisheye
const fisheye = d3.fisheye.circular()
                          .radius(400)
                          .distortion(4);
//mise en place du svg (le canvas)
var svg = d3.select("#chart").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//gestion du click en arrière plan
var backgroundClick = true;
d3.select("svg").on('click', function() {
    if(backgroundClick){
      selectedNode = [];
      root.filterEnable = filterEnum.NO_FILTER;
      if(lastZoom)
        currentScreen = lastZoom;
      lastZoom = startingScreen;
      transition(svg, startingScreen);
      update();
    }
    backgroundClick = true;
  });

//gestions du ctrl + click
var selectedNode = [];

//Set the sankey diagram properties
//Elles peuvents être modifiée automatiquement pour rendre le diagramme lisible
var sankey = d3.sankey()
.nodePadding(2)
.nodeWidth(32)
.size([width, height]);

var path = sankey.link();
var root;
var flattenRoot;
var graph = { "links" : [], "nodes" : []};
var nodeMap;

//lecture du .json dans la variable json
//d3.json("african.json", function(error, json) {
d3.json("flowered_wall_1k.json", function(error, json) {
//d3.json("river.json", function(error, json) {
  if (error) throw error;
  root = json;
  //liste des noeuds de l'arbre.
  flattenRoot = flatten(root);

  //Retourne la liste des noeuds de l'arbres.
  //On y ajoute leur profondeur ainsi que leurs valeur absolue (= depuis la racine)
  function flatten(root) {
    var nodes = [], i = 0;
    var filter = false;
    function recurse(node, percent, currentDepth)
    {
      if(node._value)
        node.value = node._value;
      else
        node._value = node.value;
      node.percent = node.value*percent;

      node.depth = ++currentDepth;
      root.maxDepth = Math.max(root.maxDepth, node.depth);

      if (node.children)
      {
        node.children.sort(function(a, b) { return a.value < b.value; });
        node.children.forEach(function(d, i) { recurse(d, node.percent, currentDepth); });
      }
      nodes.push(node);
    }
    root.maxDepth = 0;
    recurse(root, 1.0, 0);
    return nodes;
  }

  //on sort les liens graces à d3js.
  links = d3.layout.tree().links(flattenRoot);

  //on remplace les noeuds dans les liens par leur ids.
  links.forEach(function(d, i) {
  d.value = (display & displayEnum.LINK_WIDTH_FROM_ROOT) ? d.target.percent : d.target._value;
  d.target = d.target.id;
  d.source = d.source.id;});

  //préparation des noeuds et liens de l'affichage
  graph.nodes = flattenRoot.slice();
  graph.links = links.slice();
  
  //on regroupe les liens en double (en double a cause du "mauvais" parent)
  if(~display & displayEnum.MULTIPLE_LINKS)
  {
    links.forEach(function(x, i) {
      links.forEach(function(y, j) {
        if(i < j)
          if(x.source == y.source && x.target == y.target)
          {
            index = graph.links.indexOf(y);
            if(index != -1)
            {
              x.value += y.value;
              graph.links.splice(index, 1);
            }
          }
      })
    });
  }

  //on ajoute la valeur de sortie des noeuds (pour qu'elle ne soit pas > 100%)
  //seulement utile pour afficher les arcs en % de la racine
  graph.links.forEach(function(x, i) {
    x.valueOut = x.value;
    graph.links.forEach(function(y, j) {
      if(i != j)
        if(x.source == y.source)
        {
          x.valueOut += y.value;
        }
    })
  });

  nodeMap = {};

  //on enleve les noeuds doublé de l'affichage.
  flattenRoot.forEach(function(x) {
    if(!nodeMap[x.id])
    {
      x.totalValue = x.value;
      x._children = x.children;
      x.linkColor = colorEnum.BASE;
      nodeMap[x.id] = x;
    }
    else
    {
      if(x.depth != nodeMap[x.id].depth)
        throw "noeud de même label présent dans différente profondeur.";
      
      nodeMap[x.id].totalValue += x.value;
      if(x.children)
        x.children.forEach(function(node) { nodeMap[x.id]._children.push(node); });
      index = graph.nodes.indexOf(x);
      graph.nodes.splice(index, 1);
    }
  });

  //on met les objects "node" au lieux des noms.
  graph.links = graph.links.map(function(x) {
    return {
      source: nodeMap[x.source],
      target: nodeMap[x.target],
      value: (display & displayEnum.LINK_WIDTH_FROM_ROOT) ? x.value : x.value / x.valueOut // * nodeMap[x.target].value / nodeMap[x.target].totalValue
    };
  });

  root.filterEnable = filterEnum.NO_FILTER;
  update();
});

//boucle principale
function update() {

  var g = d3.select("g");
  g.selectAll("*").remove();

  //on montre l'image principale sur laquel on affichera les labels.
  showEntireLabel(root);

  //on applique les filtres
  for (var key in nodeMap) {
    if (nodeMap.hasOwnProperty(key))
    {
      var mainFilter = root.filterEnable;
      var currentNode = nodeMap[key];
      if(currentNode.filter != mainFilter)
      {
        currentNode.filter = filterEnum.NO_FILTER;
        currentNode.linkColor = colorEnum.BASE;
      }
    }
  };


  //On instancie le diagramme (positions noeuds / liens)
  sankey.depth(root.maxDepth)
    //permet de mettre une valeur fixe au noeud
    .adjustValue((display & displayEnum.NODE_HEIGHT_FROM_FATHER) ? false : true)
    .nodes(graph.nodes)
    .links(graph.links)
    .layout(0);

  //application des filtres sur les noeuds
  filter();
  function filter() {
    var filter = false;
    function recurse(node, filter)
    {
      if(root.filterEnable == filterEnum.NODE_SELECTION)
      {
        filter = filterChildren(node, filter);
      }
      if (node.children)
      {
        node.children.forEach(function(d, i) { recurse(d, filter); });
      }
    }
    if(root.filterEnable != filterEnum.NODE_MULTISELECTION)
      recurse(root, filter);
  }  

  //affichage des liens
  var link = svg.append("g").selectAll(".link")
  .data(graph.links)
  .enter().append("path")
  .attr("class", "link")
  .attr("d", path)
  .style("stroke", function(d) { return linkColor(d); })
  .style("stroke-width", function(d) { return Math.max(2, d.dy); })
  .style("stroke-opacity", function(d) { return linkOpacity(d); })
  .on("mouseover", function (d) { d3.select(this).style("stroke-opacity", 1); } )
  .on("mouseout", function() { d3.select(this).style("stroke-opacity", function(d) { return linkOpacity(d); }); })
  .sort(function(a, b) { return b.dy - a.dy; });

  //opacitée des liens
  function linkColor(d) {
    if (nodeMap[d.target.id].linkColor == nodeMap[d.source.id].linkColor)
      if(nodeMap[d.target.id].linkColor == colorEnum.SELECTED)
        return colorEnum.PATH;
      else
        return nodeMap[d.target.id].linkColor;
    if (nodeMap[d.target.id].linkColor == colorEnum.SELECTED)
      return nodeMap[d.source.id].linkColor;
    if (nodeMap[d.source.id].linkColor == colorEnum.SELECTED)
      return nodeMap[d.target.id].linkColor;
    if (nodeMap[d.target.id].linkColor == colorEnum.BASE
              || nodeMap[d.source.id].linkColor == colorEnum.BASE)
      return colorEnum.BASE;
    if(nodeMap[d.target.id].linkColor == colorEnum.PATH)
      return nodeMap[d.source.id].linkColor;
    return nodeMap[d.target.id].linkColor;
  }

  //opacitée des liens
  function linkOpacity(d) {
    if (root.filterEnable)
      if (nodeMap[d.target.id].filter == filterEnum.NO_FILTER || nodeMap[d.source.id].filter == filterEnum.NO_FILTER)
        return opacityFilteredLink;
    return baseOpacityLink;}

  // add the link titles
  link.append("title")
  .text(function(d) {
    return d.source.id + " → " + 
    d.target.id + "\n" + format(d.value); });

  //affichage des noeuds
  var node = svg.append("g").selectAll(".node")
  .data(graph.nodes)
  .enter().append("g")
  .attr("class", "node")
  .attr("transform", function(d) { 
    return "translate(" + d.x + "," + d.y + ")"; })
  .call(d3.behavior.drag()
  .origin(function(d) { return d; })
  .on("dragstart", function() { 
    this.parentNode.appendChild(this); })
  .on("drag", dragmove))
  .on("click", function (d) {
    if (d3.event.ctrlKey)
      ctrlClick(d);
    else
      click(d); })
  //.on("contextmenu", ctrlClick)
  .on("mouseover", function (data) {
    showEntireLabel(data);
    if(root.filterEnable != filterEnum.NO_FILTER || display & displayEnum.FISHEYE_MODE)
      return;
    node.style("opacity", opacityFilteredNode);
    node.filter(function (d) { return d.filter; }).style("opacity", baseOpacityNode);
    link.style("opacity", opacityFilteredLink);

    function aux(child)
    {
      node.filter(function (d) { return d.id === child.id; }).style("opacity", baseOpacityNode);
      if(child.children)
        child.children.forEach(function(d) {
          link.filter(function (l) { return (l.source.id == child.id) && (l.target.id == d.id); }).style("opacity", 1).style("stroke", colorEnum.CHILD);
          aux(d);
        });
    }
    node.filter(function (d) { return d.id === data.id; }).style("opacity", baseOpacityNode);
    if(nodeMap[data.id]._children)
      nodeMap[data.id]._children.forEach(function(d) {
        link.filter(function (l) { return (l.source.id == data.id) && (l.target.id == d.id); }).style("opacity", 1).style("stroke", colorEnum.CHILD);
          aux(d);
      });

    var idParents = getParents(data);
    idParents.forEach(function(id, i) {
      node.filter(function (d) { return d.id === id; }).style("opacity", baseOpacityNode);
      link.filter(function (l) {
          var res = false;
        idParents.forEach(function(id2) {
          if((l.source.id == id) && ((l.target.id == id2) || (l.target.id == data.id)))
            res = true;
        });
        return res;
      }).style("opacity", 1).style("stroke", colorEnum.PARENT); });
  })
  .on("mouseout", function (d) {
    showEntireLabel(root);
    if(root.filterEnable != filterEnum.NO_FILTER || display & displayEnum.FISHEYE_MODE)
      return;
    node.style("opacity", baseOpacityNode);
    link.style("opacity", 1).style("stroke", colorEnum.BASE);
    function aux(child)
    {
      if(child.children)
        child.children.forEach(function(d) { aux(d); });
    }
    aux(d);
    getParents(d).forEach(function(id) { node.filter(function (d) { return d.id === id; }).style("stroke-width", "1px"); } )
  });

  var defs = node.append('svg:defs');

  //on prépare l'image avec un 'ID' = id du noeud
  var images = defs.append("pattern")
  .attr("id", function(d) { return d.id; })
  .attr("x", 0)
  .attr("y", 0)
  .attr("height", 1)
  .attr("width", 1);

  //on ajoutes a "image" la bonne image + taille
  images.append("svg:image")
  .attr("x", 0)
  .attr("y", 0)
  .attr("height", function(d) { return Math.max(1, d.dy); })
  .attr("width", function(d) { return d.dx; })
  .attr("preserveAspectRatio", (display & displayEnum.NODE_HEIGHT_FROM_FATHER) ? "xMidYMid meet" : "none")
  //.attr("xlink:href", function(d) { return './african/' + d.image; });
  .attr("xlink:href", function(d) { return './flowered_wall/' + d.image; });
  //.attr("xlink:href", function(d) { return './River/' + d.image; });

  //création des rectangles des noeuds.
  node.append("rect")
  .attr("height", function(d) { return Math.max(1, d.dy); })
  .attr("width", sankey.nodeWidth())
  .style("fill", function(d) { return "url(#"+d.id+")"; })
  .style("opacity", function(d) {
    if (root.filterEnable)
      if (nodeMap[d.id].filter == filterEnum.NO_FILTER)
        return opacityFilteredNode;
      return baseOpacityNode;})
  .style("stroke", function(d) { return ("#"+d.color); })
  .style("stroke-width", function(d) {
    if (root.filterEnable)
      if (nodeMap[d.id].linkColor == colorEnum.SELECTED)
        return overStrokeWidth;
      if (nodeMap[d.id].filter != filterEnum.NO_FILTER)
        return filteredStrokeWidth;
      return baseStrokeWidth; })
  .style("stroke-opacity", function(d) {
    if (root.filterEnable)
      if (nodeMap[d.id].filter == filterEnum.NO_FILTER)
        return opacityFilteredNode;
      return baseOpacityNode;})
  .append("title")
  .text(function(d) { 
    return d.id + "\n" + format(d.value); });

  // pour ajouter du texte au noeuds facilement
  /*node.append("text")
  .attr("x", -6)
  .attr("y", function(d) { return d.dy / 2; })
  .attr("dy", ".35em")
  .attr("text-anchor", "end")
  .attr("transform", null)
  .text(function(d) { return d.id; })
  .filter(function(d) { return d.x < width / 2; })
  .attr("x", 6 + sankey.nodeWidth())
  .attr("text-anchor", "start");*/

  //la fonction met a jour l'image principale montrant le motif présent.
  function showEntireLabel(d) {
    var inputImage = svg.append('svg:defs').append("pattern")
      .attr("id", (1+d.id))
      .attr("x", 0)
      .attr("y", 0)
      .attr("height", 1)
      .attr("width", 1);

    //on ajoutes a "image" la bonne image + taille
    inputImage.append("svg:image")
      .attr("x", 0)
      .attr("y", 0)
      .attr("height", height/3)
      .attr("width", width/3)
      .attr("preserveAspectRatio", "none")
      //.attr("xlink:href", './african/' + d.image.slice(0, -4) + '_full.png');
      .attr("xlink:href", './flowered_wall/' + d.image.slice(0, -4) + '_full.png');
      //.attr("xlink:href", './River/' + d.image.slice(0, -4) + '_full.png');

    //création des rectangles des noeuds.
    g.append("rect")
      .attr("y", height*2/3)
      .attr("height", height/3)
      .attr("width", width/3)
      .style("fill", "url(#"+(1+d.id)+")")
      .style("stroke", "pink")
      .style("stroke-width", "3px")
      .append("title")
      .text(d.id + "\n" + format(d.value));

    //Fisheye Zoom, application sur les noeuds / liens
    //en fonction de la position de la souris
    d3.select("svg").on('mousemove', function () {
      //uniquement si on veut le fisheye dans les paramètres
      if (~display & displayEnum.FISHEYE_MODE)
        return;

      //on indique ou ce trouve la souris
      fisheye.focus(d3.mouse(this));

      //changement de la tailles des noeuds
      node.select("rect").each(function(d) { d.fisheye = fisheye(d);})
        .attr("y", function(d) { return d.fisheye.y - d.y; })
        .attr("x", function(d) { return d.fisheye.x - d.x; })
        .attr("height", function(d) { return d.dy*(1+(d.fisheye.z-1)/2); })
        .attr("width", function(d) { return d.dx*(1+(d.fisheye.z-1)/2); });

      //on remet l'image a la taille des noeuds
      images.select("image").each(function(d) { d.fisheye = fisheye(d);})
        .attr("height", function(d) { return d.dy*(1+(d.fisheye.z-1)/2); })
        .attr("width", function(d) { return d.dx*(1+(d.fisheye.z-1)/2); });

      //changement des liens pour suivre les noeuds
      link.attr("d", function(d) {
        var xSource = d.source.x;
        var ySource = d.source.y;
        var dxSource = d.source.dx;
        var xTarget = d.target.x;
        var yTarget = d.target.y;
        var dxTarget = d.target.dx;
        d.source.x = d.source.fisheye.x;
        d.source.y = d.source.fisheye.y;
        d.source.dx = d.source.dx*(1+(d.source.fisheye.z-1)/2);
        d.target.x = d.target.fisheye.x;
        d.target.y = d.target.fisheye.y;
        d.target.dx = d.target.dx*(1+(d.target.fisheye.z-1)/2);
        var pathTemp = path(d);
        d.source.x = xSource;
        d.source.y = ySource;
        d.source.dx = dxSource;
        d.target.x = xTarget;
        d.target.y = yTarget;
        d.target.dx = dxTarget;
        return pathTemp;
      });
    });
  }

  // the function for moving the nodes
  function dragmove(d) {
    d3.select(this).attr("transform", 
      "translate(" + (
       d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))
       ) + "," + (
       d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))
       ) + ")");
    sankey.relayout();
    link.attr("d", path);
  }
}

function click(d) {
  selectedNode = [];
  backgroundClick = false; //ignore le click background
  if (d3.event.defaultPrevented) return; // ignore drag

  //On met en place les filtres
  root.filterEnable = filterEnum.NODE_SELECTION;
  d.filter = filterEnum.NODE_SELECTION;
  if(lastZoom)
    currentScreen = lastZoom;
  lastZoom = findZoom(d);
  transition(svg, lastZoom);
  update();
}

function ctrlClick(d) {
  backgroundClick = false;
  d3.event.preventDefault();

  //on enleve un noeud déjà sélectionné ou on rajoute un nouveau noeud
  index = selectedNode.indexOf(d.id);
  if(index != -1)
    selectedNode.splice(index, 1);
  else
    selectedNode.push(d.id);

  if(selectedNode.length)
  {
    //on enlève tout les filtres
    for (var key in nodeMap)
      if (nodeMap.hasOwnProperty(key)){
        nodeMap[key].filter = filterEnum.NO_FILTER;
        nodeMap[key].linkColor = colorEnum.BASE;
      }
    root.filterEnable = filterEnum.NODE_MULTISELECTION;
    selectedNode.forEach(function(x, i) {
      nodeMap[x].filter = filterEnum.NODE_MULTISELECTION;
      selectedNode.forEach(function(y, j) {
        if(i < j)
          filterctrlClick(nodeMap[x], nodeMap[y]);
      })
    });
    selectedNode.forEach(function(x) { nodeMap[x].linkColor = colorEnum.SELECTED;});
  }
  update();
}

function filterctrlClick(n1, n2)
{
  var parentsN1 = getParents(n1);
  var parentsN2 = getParents(n2);
  var childrenN1 = getChildren(n1);
  var childrenN2 = getChildren(n2);

  parentsN1.forEach(function(id1) {
    parentsN2.forEach(function(id2) {
      if (id1 == id2)
      {
        currentNode = nodeMap[id1];
        currentNode.filter = filterEnum.NODE_MULTISELECTION;
        if(currentNode.linkColor == colorEnum.CHILD || currentNode.linkColor == colorEnum.PATH)
          currentNode.linkColor = colorEnum.PATH;
        else
          currentNode.linkColor = colorEnum.PARENT;
      }
    });
  });

  childrenN1.forEach(function(id1) {
    childrenN2.forEach(function(id2) {
      if (id1 == id2)
      {
        currentNode = nodeMap[id1];
        currentNode.filter = filterEnum.NODE_MULTISELECTION;
        if(currentNode.linkColor == colorEnum.PARENT || currentNode.linkColor == colorEnum.PATH)
          currentNode.linkColor = colorEnum.PATH;
        else
          currentNode.linkColor = colorEnum.CHILD;
      }
    });
  });
  if(n1.depth != n2.depth)
  {
    parentsN1.forEach(function(id1) {
      childrenN2.forEach(function(id2) {
        if (id1 == id2)
        {
          nodeMap[id1].filter = filterEnum.NODE_MULTISELECTION;
          nodeMap[id1].linkColor = colorEnum.PATH;
        }
      });
    });
    childrenN1.forEach(function(id1) {
      parentsN2.forEach(function(id2) {
        if (id1 == id2)
        {
          nodeMap[id1].filter = filterEnum.NODE_MULTISELECTION;
          nodeMap[id1].linkColor = colorEnum.PATH;
        }
      });
    });
  }
}

//calcule le rectangle de zoom pour un noeud
function findZoom(node) {
  var rect = [node.x, node.y, node.x + node.dx, node.y + node.dy];
  function aux(child)
  {
    currentNode = nodeMap[child.id];
    if(rect[0] > currentNode.x) rect[0] = currentNode.x;
    if(rect[1] > currentNode.y) rect[1] = currentNode.y;
    if(rect[2] < (currentNode.x + currentNode.dx)) rect[2] = currentNode.x + currentNode.dx;
    if(rect[3] < (currentNode.y + currentNode.dy)) rect[3] = currentNode.y + currentNode.dy;
    if(child.children)
        child.children.forEach(function(d, i) { aux(d); });
  }
  aux(node);
  var rZoom = rect[2]-rect[0] + (margin.left + margin.right)/2;
  if((rect[2] - rect[0]) / width < (rect[3] - rect[1]) / height)
  {
    rZoom = rect[3]-rect[1] + (margin.top + margin.bottom)/2;
  }
  var zoom = [(rect[2] + rect[0])/2,
              (rect[3] + rect[1])/2,
              rZoom];
  //console.log(zoom);
  return zoom;
}

//fonction de "Zoom", transition de l'écrant actuel a end.
function transition(svg, end) {
  var center = [width / 2, height / 2],
  i = d3.interpolateZoom(currentScreen, end);

  svg
  .attr("transform", transform(currentScreen))
  .transition()
  .delay(250)
  .duration(i.duration * 2)
  .attrTween("transform", function() { return function(t) { return transform(i(t)); }; })
  //.each("end", function() { d3.select(this).call(transition, end, currentScreen); });

 function transform(p) {
    var k = height / p[2];
    return "translate(" + (center[0] - p[0] * k) + "," + (center[1] - p[1] * k) + ")scale(" + k + ")";
  }
}


function filterChildren(node, filter)
{
  if(filter)
  {
    nodeMap[node.id].filter = filterEnum.NODE_SELECTION_CHILDREN;
    nodeMap[node.id].linkColor = colorEnum.CHILD;
  }
  else if(nodeMap[node.id].filter == filterEnum.NODE_SELECTION || nodeMap[node.id].filter == filterEnum.NODE_SELECTION_PASSED)
  {
    nodeMap[node.id].filter = filterEnum.NODE_SELECTION_PASSED;
    nodeMap[node.id].linkColor = colorEnum.SELECTED;
    filter = true;
  }
  return filter;
}

//renvoie un tableau des ids des parents du noeud "node"
function getParents(node)
{
  var parents = [];
  function aux(child)
  {
    if(child.depth > node.depth)
      return false;

    if(child.id == node.id)
      return true;

    var res = false;
    if(child.children)
      child.children.forEach(function(d) {
        if(aux(d))
        {
          parents.push(child.id);
          res = true;
        }
      });
    return res;
  }
  aux(root, 0);
  return parents;
}

//renvoie un tableau des ids des enfants du noeud "node"
function getChildren(node)
{
  var children = [];
  function aux(child)
  {
    children.push(child.id);
    if(child.children)
      child.children.forEach(function(d) { aux(d); });
  }
  aux(node);
  return children;
}