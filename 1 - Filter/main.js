//display parameters
var width =  window.innerWidth,
height =  window.innerHeight,
root;
//rayon minimum et maximum + rayon d'un noeud zoomé
var leafR = 7;
var minR = 10;
var maxR = 50;
var zoomOverR = 100;
//paramètre du Zoom
var minZoom = 0.5;
var maxZoom = 5;
//paramètre de filtrage.
var hideLeaves = true; 
var target;
var idFilter = [];
var dFilter = 50;
var applyFilter = 0;

//var zoom = d3.behavior.zoom().center([width / 2, height / 2]).scaleExtent([minZoom,maxZoom]).on("zoom", zoomed);

function zoomed() {
  svg.attr("transform",
    "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
}

//imgScale(1) = leafR, imgScale(3) =~ minR*8/9 + maxR*1/9 (interpolation de minR, maxR)
var imgScale = d3.scale.sqrt()
.domain([1, 2, 11])
.range([leafR, minR, maxR]);

//Force Layout, crée le graph avec des paramétres.
//linkDistance : distance des liens "favory"
//charge : éloignement des noeuds
//gravity : force d'attraction du centre
var force = d3.layout.force()
.linkDistance(40)
.charge(-250)
.gravity(.08)
.size([width, height])
.on("tick", tick);

//mise en place du svg
var svg = d3.select("body").append("svg")
.attr("width", width)
.attr("height", height)
//    .call(zoom);

var link = svg.selectAll(".link"),
node = svg.selectAll(".node");

//lecture du .json dans la variable json
d3.json("african.json", function(error, json) {
  if (error) throw error;

  root = json;
  root.filterEnable = 0;
  update();

});

//trouve la profondeur du graphe en un point. (feuille = 1)
getDepthAux = function (obj) {
  var depth = 0;
  if (obj.children) {
    obj.children.forEach(function (d) {
      var tmpDepth = getDepth(d)
      if (tmpDepth > depth) {
        depth = tmpDepth
      }
    })
  }
  return 1 + depth
}
//prend en compte si les feuilles sont masquées.
getDepth = function (obj) {
  if(hideLeaves)
    return 1 + getDepthAux(obj);
  return getDepthAux(obj);
}

//boucle principale
function update() {
  var nodes = flatten(root),
  links = d3.layout.tree().links(nodes);

  //recréé le graphe avec les noeuds et les liens 
  force
  .nodes(nodes)
  .links(links)
  .start();

  // on récupère les liens, puis on enlève les ancients liens en trop (remove)
  //et on prépare les nouveaux liens (enter)
  link = link.data(links, function(d) { return d.target.id; });

  link.exit().remove();

  link.enter().insert("line", ".node")
  .attr("class", "link")
  .style("stroke", function(d) { return "#"+(d.target.color); })
  .style("stroke-width", function(d) { return d.target.value*imgScale(getDepth(d.source));});

  d3.select("body").selectAll(".link")
  .style("stroke-opacity", function(d) {
    if (root.filterEnable)
      if (d.target.filter == 0)
        return 0.1;
      return 1;});

  //On met a jour les afficahges des noeuds. (exit et enter)
  node = node.data(nodes, function(d) { return d.id; });

  node.exit().remove();

  //on met les nouveaux noeuds "clickable"
  var nodeEnter = node.enter().append("g")
  .attr("class", "node")
  .on("click", click)
  .call(force.drag);

  var defs = nodeEnter.append('svg:defs');  

  //on prépare l'image avec un 'ID' = id du noeud
  var images = defs.append("pattern")
  .attr("id", function(d) { return d.id; })
  .attr("x", 0)
  .attr("y", 0)
  .attr("height", 1)
  .attr("width", 1);

  //on ajoutes a l'image la bonne image + taille
  images.append("svg:image")
  .attr("x", 0)
  .attr("y", 0)
  .attr("height", function(d) { return 2*imgScale(getDepth(d)); })
  .attr("width", function(d) { return 2*imgScale(getDepth(d)); })
  .attr("preserveAspectRatio", "none")
  .attr("xlink:href", function(d) { return './african/' + d.image; });

  //création du cercle sur lequel on ajoute l'image 'fill'
  nodeEnter.append("circle")
  .attr("r", function(d) { return imgScale(getDepth(d)); })
  .style("fill", function(d) { return "url(#"+d.id+")"; })
  .style("stroke", function(d) { return "#"+(d.color); })
  .style("stroke-width", function(d) { return imgScale(getDepth(d))/8; })

 /* nodeEnter.append("text")
    .attr("dy", ".25em")
    .text(function(d) { return d.id; })*/
  //Application du filtrage, si on veux des filtrages différents c'est ici.
  node.select("circle")
  .style("fill-opacity", function(d) {
    if (root.filterEnable)
      if (d.filter == 0)
        return 0.1;
      return 1;})
  .style("stroke-opacity", function(d) {
    if (root.filterEnable)
      if (d.filter == 0)
        return 0.1;
      return 1;});
  
  //animation d'un noeud lors du passage de la souris
  d3.selectAll('circle').on("mouseover", animate).
  on("mouseout", function () {
    d3.select(this).transition()
    .duration(200)
    .attr("transform", "scale(1)")
  });
  function animate() {
    var r = d3.select(this).attr("r");
    d3.select(this).transition()
    .duration(500)
    .attr("transform", "scale("+(zoomOverR / r)+")");
  }
}

//tick layout force appellé aussi souvent que possible
function tick() {
  link.attr("x1", function(d) { return d.source.x; })
  .attr("y1", function(d) { return d.source.y; })
  .attr("x2", function(d) { return d.target.x; })
  .attr("y2", function(d) { return d.target.y; });

  node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
  //si on click, on met le noeud cible au milieu de l'écrant
  if(root.filterEnable == 1)
  {
    target.x = width / 2;
    target.y = height / 2;
  }
}

// Action du click, ici on filtrer le noeud et ses enfants
function click(d) {
  if (d3.event.defaultPrevented) return; // ignore drag
  target = d;
  if(d.filter == 2)
  {
    root.filterEnable = 0;
    d.filter = 0;
  }
  else
  {
    root.filterEnable = 1;
    d.filter = 1;
  }
  update();
}

//On met l'arbre a plat et on applique les filtrages (ex: on indique quels noeud filtrer)
function flatten(root) {
  var nodes = [], i = 0;
  var filter = false;
  function recurse(node, filter)
  {
    if(root.filterEnable == 1)
    {
      filter = filterChildren(node, filter);
    }
    else if(root.filterEnable == 2)
    {
      if(!node.ColorFilter)
        node.ColorFilter = filterOne(node);
      if (node.ColorFilter == applyFilter)
        node.filter = 3;
      else
        node.filter = 0;
    }

    if (node.children)
    {
      //si on cache les feuilles, on ne rajoute pas les noeuds dans le tableau.
      if(hideLeaves)
      {
        if(!node._children)
        {
          node._children = node.children.slice();
          node._children.forEach(
            function(d, i) {
              if(!d.children)
              {
                index = node.children.indexOf(d);
                node.children.splice(index, 1);
              }
            });
        }
      }
      else
      {
        if(node._children)
          node.children = node._children;
        node._children = null;
      }
      node.children.forEach(function(d, i) { recurse(d, filter); });
    }
    if (!node.id) node.id = ++i;
    nodes.push(node);
  }

  recurse(root, filter);
  return nodes;
}


function filterChildren(node, filter)
{
  if(filter)
    node.filter = 3;
  else if(node.filter == 1)
  {
    node.filter = 2;
    return true;
  }
  else
    node.filter = 0;
  return filter;
}



function updateData()
{
  hideLeaves = !hideLeaves;
  if(root.filterEnable ==1)
    target.filter = 1;
  update();
}

function filtreData()
{
  if(!idFilter.length)
    initIdFilter();
  if(root.filterEnable == 2)
    applyFilter = (applyFilter + 1)%idFilter.length;
  else
  {
    root.filterEnable = 2;
    applyFilter = 0;
  }
  //root.filterEnable = (root.filterEnable == 2) ? 0 : 2;
  update();
  console.log(idFilter);
  console.log(root.filterEnable);
}

function filtreDataN(n)
{
  if(!idFilter.length)
    initIdFilter();
  if(root.filterEnable == 2)
    applyFilter = n%idFilter.length;
  else
  {
    root.filterEnable = 2;
    applyFilter = n%idFilter.length;
  }
  //root.filterEnable = (root.filterEnable == 2) ? 0 : 2;
  update();
}

//init le tableau de filtrage par id / couleur.
function initIdFilter()
{
  idFilter[0] = [];
  idFilter[0][0] = dFilter/2;
  idFilter[0][1] = dFilter/2;
  idFilter[0][2] = dFilter/2;
  idFilter[0][3] = 1;
}

//regarde les ids des noeuds et les regroupes par distance (r, g, b).
function filterOne(node)
{
  var r = parseInt(node.color.slice(0, 2), 16);
  var g = parseInt(node.color.slice(2, 4), 16);
  var b = parseInt(node.color.slice(4, 6), 16);
  var dMin = Number.MAX_SAFE_INTEGER;
  var index = -1;
  idFilter.forEach(function(c, i)
  {
    var dr = (r - c[0])*(r - c[0]);
    var dg = (g - c[1])*(g - c[1]);
    var db = (b - c[2])*(b - c[2]);
    if((dr+dg+db) < dMin && dr < (dFilter*dFilter) && dg < (dFilter*dFilter) && db < (dFilter*dFilter))
    {
      dMin = (dr+dg+db);
      index = i;
    }
  });
  if(index != -1)
  {
    idFilter[index][3]++;
    idFilter[index][0] = (idFilter[index][0]*(idFilter[index][3]-1) + r) / idFilter[index][3];
    idFilter[index][1] = (idFilter[index][1]*(idFilter[index][3]-1) + g) / idFilter[index][3];
    idFilter[index][2] = (idFilter[index][2]*(idFilter[index][3]-1) + b) / idFilter[index][3];
    return index;
  }
  else
  {
    idFilter.push([r, g, b, 1]);
    return (idFilter.length-1);
  }
  //filterOneOne(node);
}