<template>
  <ul v-show="!fold">
    <li class="symbol__menu-item" :class="{'folder': isFolder(item), 'active': !subfold && current !== key}" v-for="(item, key) in activeMenu" :key="key" @click.stop="clickMenuItem(key)">
      <div class="symbol__menu-item-title">{{key}}</div>
      <symbol-menu
        v-if="Object.keys(item).length > 1 && maxLevel > 1"
        :menu="item"
        :maxLevel="maxLevel-1"
        :fold="subfold && current !== key"
      ></symbol-menu>
    </li>
  </ul>
</template>

<script>
export default {
  name: "symbol-menu",
  props: {
    menu: Object,
    maxLevel: Number,
    fold: Boolean,
  },
  data() {
    return {
      subfold: true,
      current: "",
    };
  },
  computed: {
    activeMenu: function() {
      let twin = Object.assign({}, this.menu);
      delete twin.sections;
      return twin;
    }
  },
  created: function() {
  },
  methods: {
    clickMenuItem: function(key){
      this.subfold = this.subfold ? false : true;
      this.current = key;
    },
    isFolder: function(item){
      return Object.keys(item).length > 1;
    }
  },
};
</script>
