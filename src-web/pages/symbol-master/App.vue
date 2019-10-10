<template>
  <div>
    <div class="loading" v-if="loading">
      <div>{{progress}}</div>
    </div>
    <div class="symbol__container" else>
      <div class="symbol__search">搜索</div>
      <div class="symbol__main">
        <div class="symbol__menu">
          <div class="symbol__menu-section">
            <div
              class="symbol__menu-title"
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
                    v-for="(sublist, subkey) of list"
                    :key="subkey"
                    @click="changeSection(key + '_' + subkey)"
                  >{{subkey}}</li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
        <div class="symbol__list">
          <div class="symbol__list-item" v-for="(list, key) of libraries[currentLibrary].menu" :key="key">
            <div class="symbol__sublist-container" v-for="(sublist, subkey) of list" :key="subkey" :id="key + '_' + subkey">
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
      loading: false,
      info: {
        archiveVersion: mockData.libraries.archiveVersion || 0,
        fileHash: mockData.libraries.fileHash || "0",
        formatVersion: mockData.libraries.formatVersion || 1,
        id: mockData.libraries.id || "",
        name: mockData.libraries.name || ""
      },
      libraries: {},
      progress: 0,
      currentLibrary: 0,
      currentSection: "",
      currentSymbol: {},
      menu: []
    };
  },
  mounted() {
    this.devWeb = window.location.protocol === "http:" ? true : false;
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
      // this.setupPostMessage();
      // console.log(this.libraries);
      this.processData(mockData.libraries);
    },
    setupPostMessage() {
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
      console.log(libraries);
      this.libraries = libraries;
    },
    dragSymbol(section) {
      // rect = {
      //   x: rect.left,
      //   y: rect.top,
      //   width: rect.right - rect.left,
      //   height: rect.bottom - rect.top
      // };
      window.postMessage("startDragging", section);
    },
    changeLibrary(i) {
      this.currentLibrary = i;
    },
    changeSection(sec) {
      this.currentSection = sec;
      console.log(sec);
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
