<template>
  <div>
    <div class="loading" v-if="loading">
      <div>{{progress}}</div>
    </div>
    <div class="symbol__container" v-else>
      <div class="symbol__search">
        <!-- <span class="symbol__search-label">搜索</span> -->
        <div class="symbol__search-box">
          <input type="text" v-model="searchText" />
          <div class="symbol__search-cancel"></div>
        </div>
      </div>
      <div v-if="searchResult.length != 0"></div>
      <div class="symbol__main" v-else>
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
                  @mousedown="dragSymbol($event, item)"
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
      searchText: "",
      searchResult: [],
      disableScrollListener: false,
      menu: []
    };
  },
  watch: {
    searchText: val => {
      console.log(val);

      this.libraries.reduce((search, lib) => {
        return search;
      }, []);
    }
  },
  mounted() {
    this.devWeb = window.location.protocol === "http:" ? true : false;
    this.loading = this.devWeb ? false : true;
    let _this = this;
    window.receiveData = function(data) {
      _this.processData(data.libraries);
      _this.loading = false;
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
      console.log(libraries);
      this.libraries = libraries;
    },
    dragSymbol(ev, section) {
      // console.log('hello');
      console.log(section);
      let rect = ev.target.getBoundingClientRect();
      rect = {
        x: rect.left,
        y: rect.top,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top
      };
      console.log(rect);
      window.postMessage("startDragging", section, rect);
    },
    changeLibrary(i) {
      this.currentLibrary = i;
      this.calcScrollRecords();
    },
    changeSection(sec) {
      this.disableScrollListener = true;
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
    onScrollList(e) {
      if (!this.disableScrollListener) {
        let secIndex = Object.keys(
          this.scrollRecord[this.currentLibrary]
        ).findIndex(key => {
          return (
            this.scrollRecord[this.currentLibrary][key] >= e.target.scrollTop
          );
        });
        this.currentSection = Object.keys(
          this.scrollRecord[this.currentLibrary]
        )[secIndex - 1];
      } else {
        this.disableScrollListener = false;
      }
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
// console.log($vm.searchText);
// Vue.component("hilitext", {
//   template: `<div v-html="highlight(text, $vm.searchText)"></div>`,
//   props: ["text"],
//   methods: {
//     highlight: (text, query) => {
//       if (!query) {
//         return text;
//       }

//       return String(text || "").replace(
//         this.regexForSearchText(query),
//         hiliteReplacer_
//       );
//     }
//   }
// });
</script>

<style lang="less">
@import "./index";
#test {
  color: brown;
}
</style>
