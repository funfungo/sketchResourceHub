<template>
  <div>
    <div class="loading" v-if="loading">
      <div>{{progress}}</div>
    </div>
    <div class="symbol__container" v-else>
      <div class="symbol__search">搜索</div>
      <div class="symbol__main">
        <div class="symbol__menu">
          <div class="symbol__menu-section">
            <div
              class="symbol__menu-title"
              :class="{current: i === currentLibrary}"
              v-for="(lib, i) in libraries"
              :key="lib.id"
              @click="changeLibrary(i)"
            >{{lib.name}}</div>
          </div>
          <div class="symbol__menu-head">
            <ul>
              <li
                class="symbol__menu-item"
                v-for="(list, key) of libraries[currentLibrary].menu"
                :key="key"
              >
                <div class="symbol__menu-item-title">{{key}}</div>
                <ul class="symbol__submenu">
                  <li
                    :class="{current : currentSection === key + '_' + subkey}"
                    v-for="(sublist, subkey) of list"
                    :key="subkey"
                    @click="changeSection(key + '_' + subkey)"
                  >{{subkey}}</li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
        <div class="symbol__list" v-if="libraries[currentLibrary]" @scroll="onScrollList">
          <div
            class="symbol__list-item"
            v-for="(list, key) of libraries[currentLibrary].menu"
            :key="key"
          >
            <div
              class="symbol__sublist-container"
              v-for="(sublist, subkey) of list"
              :key="subkey"
              :id="key + '_' + subkey"
            >
              <div v-for="item in sublist" :key="item.id" class="symbol__item">
                <div class="symbol__item-title">{{item.name}}</div>
                <img
                  :src="devWeb ? requestLayerImageUrl(item) : 'file://' + item.imagePath"
                  :width="item.width"
                  :height="item.height"
                  @mousedown="dragSymbol(item)"
                />
              </div>
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
      devWeb: true,
      loading: true,
      info: {
        archiveVersion: mockData.libraries.archiveVersion || 0,
        fileHash: mockData.libraries.fileHash || "0",
        formatVersion: mockData.libraries.formatVersion || 1,
        id: mockData.libraries.id || "",
        name: mockData.libraries.name || ""
      },
      libraries: [],
      progress: 0,
      currentLibrary: 0,
      currentSection: "",
      currentSymbol: {},
      scrollRecord: {},
      menu: []
    };
  },
  mounted() {
    this.devWeb = window.location.protocol === "http:" ? true : false;
    this.loading = this.devWeb ? false : true;
    let _this = this;
    window.receiveData = function(data) {
      _this.processData(data.libraries);
      _this.loading = false;
      console.log("receive");
      _this.calcScrollRecords();
    };
    window.progress = function(progress) {
      _this.progress = progress;
    };

    this.init();
  },
  methods: {
    init() {
      this.setupPostMessage();
      this.processData(mockData.libraries);
      this.calcScrollRecords();
    },
    setupPostMessage() {
      if (!this.devWeb)
        window.postMessage("loadKit", "receiveData", "progress");
    },
    processData(libraries) {
      libraries.forEach(lib => {
        //sort symbols by name string;
        lib.sections.sort((a, b) => {
          return a.name.localeCompare(b.name);
        });

        //1.iOS/1.Bars/1.Status Bar/Light Status Bar
        lib.menu = lib.sections.reduce((menu, item) => {
          let names = item.name.split("/");
          if (names.length === 0) return;
          if (!menu[names[0]]) menu[names[0]] = {};
          if (!menu[names[0]][names[1]]) {
            menu[names[0]][names[1]] = [];
          } else {
            menu[names[0]][names[1]].push(item);
          }
          return menu;
        }, {});
      });
      this.libraries = libraries;
    },
    dragSymbol(section) {
      window.postMessage("startDragging", section);
    },
    changeLibrary(i) {
      this.currentLibrary = i;
      this.calcScrollRecords();
    },
    changeSection(sec) {
      this.currentSection = sec;
      let scrollTop = this.scrollRecord[this.currentLibrary][sec];
      document.querySelector(".symbol__list").scrollTop = scrollTop;
    },
    calcScrollRecords() {
      if (this.scrollRecord[this.currentLibrary]) return;
      let mapScroll = {};
      this.$nextTick(() => {
        document
          .querySelectorAll(".symbol__sublist-container")
          .forEach(item => {
            let [a, b] = item.id.split("_");
            mapScroll[item.id] = item.offsetTop;
          });
        if (Object.keys(mapScroll).length > 0) {
          this.scrollRecord[this.currentLibrary] = mapScroll;
        }
      });
    },
    onScrollList(e){
      let secIndex = Object.keys(this.scrollRecord[this.currentLibrary]).findIndex((key) => {
        return this.scrollRecord[this.currentLibrary][key] >= e.target.scrollTop;
      })
      this.currentSection = Object.keys(this.scrollRecord[this.currentLibrary])[secIndex-1];
    },
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
