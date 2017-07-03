//variable paramètre d'affichage
var percentOfRoot = false;
var units = "Widgets";

var margin = {top: 10, right: 10, bottom: 10, left: 10},
width = (window.innerWidth) - 50 - margin.left - margin.right,
height = (window.innerHeight) - 50 - margin.top - margin.bottom;

var formatNumber = d3.format(",.0f"),    // zero decimal places
format = function(d) { return formatNumber(d) + " " + units; };

//Zoom Test
var startingScreen = [width / 2, height / 2, Math.min(width, height)],
currentScreen = startingScreen,
lastZoom;

// append the svg canvas to the page
var svg = d3.select("#chart").append("svg")
.attr("width", width + margin.left + margin.right)
.attr("height", height + margin.top + margin.bottom)
.append("g")  
.attr("transform", 
  "translate(" + margin.left + "," + margin.top + ")");
//.call(transition, p1, p1);

// Set the sankey diagram properties
var sankey = d3.sankey()
.nodePadding(2)
.nodeWidth(32)
.size([width, height]);

var path = sankey.link();
var root;
var nodeMap;
// load the data
d3.json("flowered_wall_1k.json", function(error, json) {
  if (error) throw error;
  root = json;
  update();
});

function update() {
  var g = d3.select("g");
  g.selectAll("*").remove();
  var node2 = flatten(root),
  links2 = d3.layout.tree().links(node2);
  // Returns a list of all nodes under the root.
  function flatten(root) {
    var nodes = [], i = 0;
    var filter = false;
    function recurse(node, filter, percent)
    {
      if(node._value)
        node.value = node._value;
      else
        node._value = node.value;

      if(root.filterEnable == 1)
      {
        filter = filterChildren(node, filter);
      }
      node.percent = node.value*percent;
      if (node.children)
      {
        node.children.sort(function(a, b) { return a.value < b.value; });
        node.children.forEach(function(d, i) { recurse(d, filter, node.percent); });
      }
      if (!node.id) node.id = ++i;
      nodes.push(node);
    }
    recurse(root, filter, 1.0);
    return nodes;
  }

  node2.forEach(function(d, i) { d.name = d.id;});
  links2.forEach(function(d, i) {
  //d.value = d.target.percent;
  d.value = d.target.value;
  d.target = d.target.id;
  d.source = d.source.id;});

  var graph = { "links" : [], "nodes" : []};
  graph.nodes = node2.slice();
  graph.links = links2.slice();
  links2.forEach(function(x, i) {
    links2.forEach(function(y, j) {
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
  node2.forEach(function(x) {
   if(!nodeMap[x.name])
   {
    x.totalValue = x.value;
    nodeMap[x.name] = x;
  }
  else
  {
    nodeMap[x.name].filter = Math.max(nodeMap[x.name].filter, x.filter);
    nodeMap[x.name].totalValue += x.value;
    index = graph.nodes.indexOf(x);
    graph.nodes.splice(index, 1);
  }});
  graph.links = graph.links.map(function(x) {
    return {
      source: nodeMap[x.source],
      target: nodeMap[x.target],
      value: x.value / x.valueOut // * nodeMap[x.target].value / nodeMap[x.target].totalValue
    };
  });

  getDepth = function (obj) {
    var depth = 0;
    if (obj.children) {
      obj.children.forEach(function (d) {
        var tmpDepth = getDepth(d)
        if (tmpDepth > depth) {
          depth = tmpDepth
        }
      })
    }
    return 1 + depth;
  }

  sankey
  .depth(getDepth(root))
  .leafNodeValue(1)
  .nodes(graph.nodes)
  .links(graph.links)
  .layout(0);

//throw new Error("Something went badly wrong!");
// add in the links

var link = svg.append("g").selectAll(".link")
.data(graph.links)
.enter().append("path")
.attr("class", "link")
.attr("d", path)
.style("stroke-width", function(d) { return Math.max(1, d.dy); })
.style("stroke-opacity", function(d) {
  if (root.filterEnable)
    if (d.target.filter == 0 || d.source.filter == 0)
      return 0.04;
  return 0.3;})
.sort(function(a, b) { return b.dy - a.dy; });

// add the link titles
link.append("title")
.text(function(d) {
  return d.source.name + " → " + 
  d.target.name + "\n" + format(d.value); });

// add in the nodes
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
.on("click", click);

var defs = node.append('svg:defs');

  //on prépare l'image avec un 'ID' = id du noeud
  var images = defs.append("pattern")
  .attr("id", function(d) { return d.id; })
  .attr("x", 0)
  .attr("y", 0)
  .attr("height", 1)
  .attr("width", 1);

  images.append("svg:image")
  .attr("x", 0)
  .attr("y", 0)
  .attr("height", function(d) { return Math.max(1, d.dy); })
  .attr("width", function(d) { return d.dx; })
  .attr("preserveAspectRatio", "none")
  .attr("xlink:href", function(d) { return './flowered_wall/' + d.image; });

  // add the rectangles for the nodes
  node.append("rect")
  .attr("height", function(d) { return Math.max(1, d.dy); })
  .attr("width", sankey.nodeWidth())
  .style("fill", function(d) { return "url(#"+d.id+")"; })
  .style("opacity", function(d) {
    if (root.filterEnable)
      if (d.filter == 0)
        return 0.1;
      return 1;})
  .style("stroke", function(d) {
    if (root.filterEnable)
      if (d.filter != 0)
        return 'black';
      return ("#"+d.color); })
  .style("stroke-opacity", function(d) {
    if (root.filterEnable)
      if (d.filter == 0)
        return 0.1;
      return 1;})
  .append("title")
  .text(function(d) { 
    return d.name + "\n" + format(d.value); });

  // add in the title for the nodes
  node.append("text")
  .attr("x", -6)
  .attr("y", function(d) { return d.dy / 2; })
  .attr("dy", ".35em")
  .attr("text-anchor", "end")
  .attr("transform", null)
  .text(function(d) { return d.name; })
  .filter(function(d) { return d.x < width / 2; })
  .attr("x", 6 + sankey.nodeWidth())
  .attr("text-anchor", "start");

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
  if (d3.event.defaultPrevented) return; // ignore drag
  target = d;
  if(d.filter == 2)
  {
    root.filterEnable = 0;
    d.filter = 0;
    if(lastZoom)
      currentScreen = lastZoom;
    lastZoom = startingScreen;
    transition(svg, startingScreen);
  }
  else
  {
    root.filterEnable = 1;
    d.filter = 1;
    if(lastZoom)
      currentScreen = lastZoom;
    lastZoom = findZoom(d);
    transition(svg, findZoom(d));
  }
  update();
}

function findZoom(node) {
  var rect = [node.x, node.y, node.x + node.dx, node.y + node.dy];
  console.log("rect rect zoom");
  console.log(rect);
    /*var svgContainer = d3.select("svg");
var circle = svgContainer.append("rect")
.attr("x", rect[0])
.attr("y", rect[1])
.attr("width", rect[2]-rect[0])
.attr("height", rect[3]-rect[1])
.attr("fill", 'red')
.attr("opacity", 0.1);*/
  var tata = 0;
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
  console.log(rect);
    /*var svgContainer = d3.select("svg");
var circle = svgContainer.append("rect")
.attr("x", rect[0])
.attr("y", rect[1])
.attr("width", rect[2]-rect[0])
.attr("height", rect[3]-rect[1])
.attr("opacity", 0.05);*/
  var zoom = [(rect[2] + rect[0])/2,
              (rect[3] + rect[1])/2,
              Math.min(rect[2]-rect[0] + margin.left + margin.right, rect[3]-rect[1] + margin.top + margin.bottom)];
  console.log(zoom);
  return zoom;
}


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