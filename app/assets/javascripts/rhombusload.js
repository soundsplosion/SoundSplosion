(function(toAttach) {
  toAttach.DenotoRhombus = function(constraints) {
    toAttach.Rhombus.call(this, constraints);
    var rhombThis = this;
    this.setSampleResolver(function(sampleSetName, callback) {
      var infoReq = new XMLHttpRequest();
      var dirPath = "/samples/" + sampleSetName + "/";
      infoReq.open("GET", dirPath + "samples.json", true);
      infoReq.responseType = "json";

      infoReq.onload = function() {
        var infoMap = infoReq.response;
        var sampleCount = Object.keys(infoMap).length;

        var finalMap = {};
        for (var pitch in infoMap) {
          function getSample(pitch, file) {
            var sampleReq = new XMLHttpRequest();
            sampleReq.open("GET", dirPath + file, true);
            sampleReq.responseType = "arraybuffer";

            sampleReq.onload = function() {
              rhombThis._ctx.decodeAudioData(sampleReq.response, function(buff) {
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
    return this;
  };
})(this);
