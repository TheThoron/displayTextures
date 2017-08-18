(function() {
    
    
  d3.fisheye = {
      
    scale: function(scaleType) {
      return d3_fisheye_scale(scaleType(), 3, 0);
    },
    circular: function() {
      //create default accessor functions
      var getX = function(d) { return d.x;};
      var getY = function(d) { return d.y;};
        
      var radius = 200,
          distortion = 2,
          k0,
          k1,
          focus = [0, 0];

      function fisheye(d) {
        var dx = getX(d) - focus[0], //use accessor functions
            dy = getY(d) - focus[1],
            dd = Math.sqrt(dx * dx + dy * dy);
        if (!dd || dd >= radius) 
            return {x: getX(d), y: getY(d), z: 1};
          
        var k = k0 * (1 - Math.exp(-dd * k1)) / dd * .75 + .25;
        return {x: focus[0] + dx * k, y: focus[1] + dy * k, z: Math.min(k, 10)};
      }

      function rescale() {
        k0 = Math.exp(distortion);
        k0 = k0 / (k0 - 1) * radius;
        k1 = distortion / radius;
        return fisheye;
      }
        
      //getter/setter for accessor functions
     fisheye.x = function(_) {
        if (!arguments.length) return getX;
        if (typeof(_) != "function")
            getX = function(d) {return +_;};
        else getX = _;
        return rescale();
      },      
     fisheye.y =  function(_) {
        if (!arguments.length) return getY;
        if (typeof(_) != "function")
            getY = function(d) {return +_;};
        else getY = _;
        return rescale();
      },

      fisheye.radius = function(_) {
        if (!arguments.length) return radius;
        radius = +_;
        return rescale();
      };

      fisheye.distortion = function(_) {
        if (!arguments.length) return distortion;
        distortion = +_;
        return rescale();
      };

      fisheye.focus = function(_) {
        if (!arguments.length) return focus;
        focus = _;
        return fisheye;
      };

      return rescale();
    }
  };

})();