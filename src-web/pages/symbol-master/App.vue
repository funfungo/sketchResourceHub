<template>
  <div>
    <div class="loading" v-if="loading">
      <div class="loading__wrp">
        <!-- {{progress}} -->
        <div class="loading__bar">
          <div class="loading__bar-inner" :style="'width: ' + progress * 100 + '%'"></div>
        </div>
      </div>
    </div>

    <div class="symbol__container" v-else>
      <div class="symbol__search" data-app-region="drag">
        <!-- <span class="symbol__search-label">搜索</span> -->
        <div class="symbol__search-box">
          <input type="text" v-model="searchText" />
          <div class="symbol__search-cancel" v-if="searchText.length > 0" @click="searchText = ''"></div>
        </div>
      </div>
      <symbol-list :menu="currentLibrary.menu"></symbol-list>

      <div class="symbol__empty" v-if="libraries.length === 0">空</div>
      <div class="symbol__main" v-else>
        <div class="symbol__menu">
          <div class="symbol__menu-section" v-if="searchText.length !== 0">
            <div
              class="symbol__menu-title"
              :class="{current: i === currentLibrary}"
              v-for="(lib, i) in libraries"
              :key="lib.id"
              @click="changeLibrary(i)"
              v-html="lib.name"
            ></div>
          </div>
          <div class="symbol__menu-section" v-else>
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
                <div class="symbol__menu-item-title" v-if="searchText.length !== 0" v-html="key"></div>
                <div class="symbol__menu-item-title" v-else>{{key}}</div>
                <ul class="symbol__submenu" v-if="searchText.length !== 0">
                  <li
                    :class="{current : currentSection === key + '_' + subkey}"
                    v-for="(sublist, subkey) of list"
                    :key="subkey"
                    @click="changeSection(key + '_' + subkey)"
                    v-html="subkey"
                  ></li>
                </ul>
                <ul class="symbol__submenu" v-else>
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
                <div class="symbol__item-title" v-if="searchText.length !== 0" v-html="item.name"></div>
                <div class="symbol__item-title" v-else>{{item.name}}</div>
                <img
                  :src="devWeb ? requestLayerImageUrl(item) : 'file://' + item.imagePath"
                  :width="item.width"
                  :height="item.height"
                  :style="'background-color: rgba(' + item.bgColor + ')'"
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
import SymbolList from "./components/symbol-list.vue";
export default {
  components: {
    SymbolList
  },
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
      libraries: [],
      originLibraries: [],
      progress: 0,
      currentLibrary: 0,
      currentSection: "",
      currentSymbol: {},
      scrollRecord: {},
      searchText: "",
      disableScrollListener: false,
      menu: []
    };
  },
  watch: {
    searchText: function(val) {
      if (val.length == 0) {
        this.libraries = this.originLibraries;
        this.calcScrollRecords();
        return;
      }
      let searchResult = this.originLibraries.reduce((search, lib) => {
        let result = [];
        for (let i = 0; i < lib.sections.length; i++) {
          let reg = new RegExp(val, "i", "g");
          if (lib.sections[i].name.match(reg)) {
            let target = Object.assign({}, lib.sections[i]);
            target.name = target.name.replace(
              reg,
              '<span class="highlight">$&</span>'
            );
            result.push(target);
          }
        }
        if (result.length > 0) {
          let searchObject = {
            archiveVersion: lib.archiveVersion,
            fileHash: lib.fileHash,
            formatVersion: lib.formatVersion,
            id: lib.id,
            name: lib.name,
            sections: result
          };
          search.push(searchObject);
        }
        return search;
      }, []);
      this.processData(searchResult);
      this.calcScrollRecords();
    }
  },
  mounted() {
    this.devWeb = window.location.protocol === "http:" ? true : false;
    let _this = this;
    window.receiveData = function(data) {
      _this.processData(data.libraries);
      _this.loading = false;
      _this.calcScrollRecords();
    };
    window.progress = function(progress) {
      _this.progress = progress;
      if (!_this.loading) {
        _this.loading = true;
      }
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

        lib.menu = lib.sections.reduce((menu, item) => {
          let name = item.name.replace(/([^<])\//gi, "$1#");
          let names = name.split("#");
          if (names.length === 0) return;
          if (!menu[names[0]]) menu[names[0]] = {};
          if (!menu[names[0]][names[1]]) menu[names[0]][names[1]] = [];
          menu[names[0]][names[1]].push(item);

          return menu;
        }, {});
        // lib.menu =  this.processMenu({}, lib.sections);
      });

      if (this.originLibraries.length === 0 && libraries.length !== 0) {
        this.originLibraries = libraries;
      }
      this.libraries = libraries;
      console.log(libraries);
    },
    processMenu(menu = {}, sections, level = 3) {
      while (level) {
        level--;
        if(sections === undefined) return;
        sections.forEach(item => {
          let names = item.name.replace(/([^<])\//gi, "$1#").split("#");
          let key = names[0];
          if (!menu[key]) {
            menu[key] = {};
            menu[key].section = [];
          }
          names.shift(0);
          let subname = names.join("/");
          let newItem = Object.assign({}, item);
          newItem.name = subname;
          menu[key].section.push(newItem);
        });

        for(let key in menu){
          this.processMenu(menu[key], menu[key].section, level);
        }
      }
      return menu;
    },
    dragSymbol(ev, section) {
      let rect = ev.target.getBoundingClientRect();
      rect = {
        x: rect.left,
        y: rect.top,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top
      };
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
</script>

<style lang="less">
@import "./index";
#test {
  color: brown;
}
</style>
