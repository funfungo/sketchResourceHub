<template>
  <div>
    <div class="loading" v-if="loading">
      <div>{{progress}}</div>
    </div>
    <div class="symbol__container">
      <div class="symbol__library">
        <div class="symbol__library-item" v-for="(lib,i) in libraries" :key="lib.id">
          {{lib.name}}
          <div class="symbol__sections">
            <div class="symbol__section" v-for="(section,j) in libraries[i].sections" :key="j">
              {{section.name}}
              <img
                :src="devWeb ? requestLayerImageUrl(section) : 'file://' + section.imagePath"
                :width="section.width"
                :height="section.height"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import mockData from "../../mock.json";
export default {
  data() {
    return {
      devWeb: false,
      loading: true,
      info: {
        archiveVersion: mockData.libraries.archiveVersion || 0,
        fileHash: mockData.libraries.fileHash || "0",
        formatVersion: mockData.libraries.formatVersion || 1,
        id: mockData.libraries.id || "",
        name: mockData.libraries.name || ""
      },
      libraries: mockData.libraries,
      progress: 0
    };
  },
  mounted() {
    console.log(window.location);
    this.devWeb = window.location.protocol === 'http:' ? true : false;
    let _this = this;
    window.receiveData = function(data) {
      _this.libraries = JSON.parse(JSON.stringify(data)).libraries;
    };
    window.progress = function(progress) {
      _this.progress = progress;
    };

    this.init();
  },
  methods: {
    init() {
      this.setupPostMessage();
      this.processData(this.libraries.symbols);
    },
    setupPostMessage() {
      window.postMessage("loadKit", "receiveData", "progress");
    },
    processData(symbols) {},

    requestLayerImageUrl(symbol) {
      let canvas = document.createElement("canvas");
      canvas.width = symbol.width * 2;
      canvas.height = symbol.height * 2;
      let ctx = canvas.getContext("2d");
      ctx.scale(2, 2);
      ctx.fillStyle = "#3F51B5";
      ctx.fillRect(0, 0, symbol.width, symbol.height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font =
        Math.ceil(Math.max(13, Math.min(symbol.width, symbol.height) / 10)) +
        "px Menlo";
      ctx.fillStyle = "rgba(255,255,255,.6)";
      ctx.fillText(
        `${symbol.width}x${symbol.height}`,
        symbol.width / 2,
        symbol.height / 2
      );
      let url = canvas.toDataURL();
      // let subPath = sticker.imagePath.replace(/.*net.nurik.roman.sketch.stickers/, '');
      // let url = '/real-sticker-cache/' + subPath;
      return url;
    }
  }
};
</script>

<style lang="less">
@import "./index";
#test {
  color: brown;
}
</style>
