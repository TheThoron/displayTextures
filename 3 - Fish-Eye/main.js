var root = {
    "name": "Text",
    "group" : 0,
    "children": [
        {
            "name": "Text.0",
            "group" : 2,
            "note" : "",
            "children": [
                {"name": "Text.1", "group" : 2, "children" : [
                    {"name": "Text.10", "group" : 2},
                    {"name": "Text.12", "group" : 2,"children": [
                        {"name": "Text.120", "group" : 2},
                        {"name": "Text.121", "group" : 2},
                        {"name": "Text.129", "group" : 2}
                    ]},        
                    {"name": "Text.14", "group" : 2},
                    {"name": "Text.15", "group" : 2, "children" : [
                        {"name": "Text.150", "group" : 2},
                        {"name": "Text.151", "group" : 2},
                        {"name": "Text.159", "group" : 2}
                    ]},  
                    {"name": "Text.18", "group" : 2,"children" : [
                        {"name": "Text.180", "group" : 2},
                        {"name": "Text.181", "group" : 2},
                        {"name": "Text.182", "group" : 2},
                        {"name": "Text.188", "group" : 2}
                    ]},
                    {"name": "Text.19", "group" : 2}
                ]},
                {"name": "Text.2", "group" : 2, "children" : [
                    {"name": "Text.20", "group" : 2},
                    {"name": "Text.21", "group" : 2},
                    {"name": "Text.22", "group" : 2,"children": [
                        {"name": "Text.220", "group" : 2},
                        {"name": "Text.221", "group" : 2},
                        {"name": "Text.229", "group" : 2}
                    ]},       
                    {"name": "Text.23", "group" : 2,"children": [
                        {"name": "Text.230", "group" : 2},
                        {"name": "Text.231", "group" : 2},
                        {"name": "Text.232", "group" : 2},
                        {"name": "Text.239", "group" : 2}
                    ]},           
                    {"name": "Text.24", "group" : 2},
                    {"name": "Text.25", "group" : 2,"children":[
                        {"name": "Text.250", "group" : 2},
                        {"name": "Text.251", "group" : 2},
                        {"name": "Text.259", "group" : 2}
                    ]},   
                    {"name": "Text.26", "group" : 2},
                    {"name": "Text.27", "group" : 2},
                    {"name": "Text.28", "group" : 2,"children": [
                        {"name": "Text.280", "group" : 2},
                        {"name": "Text.281", "group" : 2},
                        {"name": "Text.282", "group" : 2},
                        {"name": "Text.288", "group" : 2}
                    ]},   
                    {"name": "Text.29", "group" : 2}
                ]},
                {"name": "Text.9", "group" : 2, "children" : [
                    {"name": "Text.92", "group" : 2,"children": [
                        {"name": "Text.920", "group" : 2},
                        {"name": "Text.921", "group" : 2},
                        {"name": "Text.929", "group" : 2}
                    ]},         
                    {"name": "Text.94", "group" : 2},
                    {"name": "Text.95", "group" : 2,"children":[
                        {"name": "Text.950", "group" : 2},
                        {"name": "Text.951", "group" : 2},
                        {"name": "Text.959", "group" : 2}
                    ]},
                    {"name": "Text.96", "group" : 2},
                    {"name": "Text.97", "group" : 2},
                    {"name": "Text.98", "group" : 2,"children": [
                        {"name": "Text.980", "group" : 2},
                        {"name": "Text.981", "group" : 2},
                        {"name": "Text.982", "group" : 2},
                        {"name": "Text.988", "group" : 2}
                    ]},             
                    {"name": "Text.99", "group" : 2}
                ]} //*/
            ]
        }
    ]
};


function getHPosition(d){
    //calculate the transformed (Cartesian) position (H, V)
    //(without fisheye effect)
    //from the polar coordinates (x,y) where 
    //x is the angle
    //y is the distance from (radius,radius)
    //See http://www.engineeringtoolbox.com/converting-cartesian-polar-coordinates-d_1347.html
    
    return (d.y)*Math.cos(d.x);
}
function getVPosition(d){
    return d.y*Math.sin(d.x);
};

var diameter = 650,
    margin = 40,
    width = diameter,
    height = diameter,
    radius = diameter/2 - 2*margin;

// initialization for fisheye distortion
var fisheye = d3.fisheye.circular()
    .radius(100)
    .distortion(2)
//    .focus([radius,radius]) //just for testing...
    .x(getHPosition)
    .y(getVPosition);

//console.log(fisheye);
//console.log(fisheye.x());
//console.log(fisheye.y());
//console.log(a={x:0,y:0},
//            [getHPosition(a),getVPosition(a)],
//            fisheye(a));
//console.log(a={x:180,y:25},
//            [getHPosition(a),getVPosition(a)],
//            fisheye(a));
//console.log(a={x:90,y:radius},
//            [getHPosition(a),getVPosition(a)],
//            fisheye(a));

var tree = d3.layout.tree()
.size([Math.PI*2, radius])  //NOTE angles are in radians!!!
.separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });


var diagonal = d3.svg.diagonal()
.projection(function(d) { 
    return [getHPosition(d), getVPosition(d)]; });

var svg = d3.select("#graph").append("svg")
.attr("width", width)
.attr("height", height)
.append("g") 
.attr("transform", "translate(" + (radius + margin) + ","
      + (radius + margin) + ")");
//coordinates will be with respect to the center
//of plotting area

//add a transparent background to catch mouse events:
svg.append("rect").classed("background", true)
    .attr("x", -radius)
    .attr("y", -radius)
    .attr("width", 2*radius)
    .attr("height", 2*radius);

var color = d3.scale.category10();

d3.select(self.frameElement).style("height", diameter + "px");

update(root);

function update(source) {
    var nodes = tree.nodes(source),
        links = tree.links(nodes);
    
    var edges = svg.selectAll(".link")
    .data(links)
    .enter().append("path")
    .attr("class", "edge")
    .attr("d", diagonal);
    
    var nodeEnter = svg.selectAll(".node")
    .data(nodes);
    
    var g = nodeEnter
    .enter().append("g")
    .attr("class", "node");
    
    var circles = nodeEnter.append("circle")
    // set positions using transformed coordinates
    .attr("cx", getHPosition)
    .attr("cy", getVPosition)
    .attr("class","circle")
    .attr("r", 4.5)
    .style("fill", function(d) { return color(d.group);});
    
    var names = nodeEnter.append("text")
    // set positions using transformed coordinates
    .attr("x", getHPosition)
    .attr("y", getVPosition)
    .attr("class", "text")
    .attr("dy", ".31em")
    .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
   // .attr("transform", function(d) { return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"; })
    .text(function(d) { return d.name; });
    
  //*  
    svg.on("mousemove", function() {
        fisheye
        .focus(d3.mouse(this));
        
        // transforming fisheye coords that orginated from untransformed coords computed by d3.layout.tree
        //g.attr("transform", function(d) { d.fisheye = fisheye(d); return "rotate(" + (d.fisheye.x - 90) + ")translate(" + d.fisheye.y + ")"; });
        
        circles
        .each(function(d) { d.fisheye = fisheye(d); })
        .attr("cx", function(d) { return d.fisheye.x; })
        .attr("cy", function(d) { return d.fisheye.y; })
        .attr("r", function(d) { return d.fisheye.z * 4.5; });
        
        names
        .attr("x", function(d) { return d.fisheye.x; })
        .attr("y", function(d) { return d.fisheye.y; });
        
        // re-setting the projection according to fisheye coords
        diagonal.projection(function(d) { d.fisheye = fisheye(d); return [d.fisheye.x, d.fisheye.y]; }) 
        // re-setting the edges accordindly     
        edges.attr("d", diagonal);
    });// */
    
}