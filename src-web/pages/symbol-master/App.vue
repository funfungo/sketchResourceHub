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
              <img :src="'file://' +section.imagePath" :width="section.width" :height="section.height">
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
      loading: true,
      info: {
        archiveVersion: mockData.libraries.archiveVersion || 0,
        fileHash: mockData.libraries.fileHash || "0",
        formatVersion: mockData.libraries.formatVersion || 1,
        id: mockData.libraries.id || "",
        name: mockData.libraries.name || "",
      },
      libraries: mockData.libraries,
      progress: 0
    };
  },
  mounted() {
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
    processData(symbols) {}
  }
};
</script>

<style lang="less">
@import "./index";
#test {
  color: brown;
}
</style>
