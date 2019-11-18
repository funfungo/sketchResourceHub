<template>
  <div :id="parent" :class="'menu__level' + maxLevel">
    <div v-if="menu.sections.length > 0">
      <div v-for="(item,i) in menu.sections" :key="i">
        <div class="symbol__item-title">{{item.name}}</div>
        <img
          :src="devWeb ? requestLayerImageUrl(item) : 'file://' + item.imagePath"
          :width="item.width"
          :height="item.height"
          :style="'background-color: rgba(' + item.bgColor + ')'"
        />
      </div>
    </div>
    <div v-for="(item, key) in activeMenu" :key="key">
      <symbol-list :menu="item" :maxLevel="maxLevel-1" :devWeb="devWeb" :parent="parent ? parent + '-' + key : key"></symbol-list>
    </div>
  </div>
</template>

<script>
export default {
  name: "symbol-list",
  props: {
    menu: Object,
    maxLevel: Number,
    devWeb: Boolean,
    parent: {
      type: String,
      default: ""
    }
  },
  data() {
    return {};
  },
  computed: {
    activeMenu: function() {
      let twin = Object.assign({}, this.menu);
      delete twin.sections;
      return twin;
    }
  },

  created: function() {},
  methods: {
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
