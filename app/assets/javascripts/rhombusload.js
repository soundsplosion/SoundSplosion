(function(toAttach) {
  toAttach.makeDenotoRhombus = function(constraints) {
    var rhomb = new toAttach.Rhombus(constraints);
    rhomb.setSampleResolver(function(sampleSetName, callback) {
      var infoReq = new XMLHttpRequest();
      var dirPath = "/samples/" + encodeURIComponent(sampleSetName) + "/";
      infoReq.open("GET", dirPath + "samples.json", true);
      infoReq.responseType = "json";

      infoReq.onload = function() {
        var infoMap = infoReq.response;
        if (!infoMap) {
          console.log("[Rhombus] Couldn't get sample info from \"" + dirPath + "samples.json\"");
          return;
        }

        var sampleCount = Object.keys(infoMap).length;

        var finalMap = {};
        for (var pitch in infoMap) {
          function getSample(pitch, file) {
            var sampleReq = new XMLHttpRequest();
            sampleReq.open("GET", dirPath + encodeURIComponent(file), true);
            sampleReq.responseType = "arraybuffer";

            sampleReq.onload = function() {
              Rhombus._ctx.decodeAudioData(sampleReq.response, function(buff) {
                finalMap[+pitch] = [buff, file];
                if (Object.keys(finalMap).length == sampleCount) {
                  callback(finalMap);
                }
              });
            };

            sampleReq.send();
          }

          getSample(pitch, infoMap[pitch]);
        }
      };

      infoReq.send();
    });
    return rhomb;
  };
})(this);
