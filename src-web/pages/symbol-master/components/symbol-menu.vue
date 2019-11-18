<template>
  <ul v-show="!fold">
    <li
      v-for="(item, key) in activeMenu"
      class="symbol__menu-item"
      :class="{'folder': isFolder(item) && maxLevel > 1, 'active': menuStatus[parent + '-' + key]}"
      :key="key"
      @click.stop="clickMenuItem(key)"
    >
      <div class="symbol__menu-item-title">{{key}}</div>
      <symbol-menu
        v-if="Object.keys(item).length > 1 && maxLevel > 1"
        :menu="item"
        :maxLevel="maxLevel-1"
        :current="current"
        :parent="parent ? parent + '-' + key : key"
        :fold="!menuStatus[key]"
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
    current: String,
    parent: {
      type: String,
      default: ""
    }
  },
  data() {
    return {
      menuStatus: {}
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
    Object.keys(this.menu).forEach(key => {
      this.menuStatus[this.parent + "-" + key] = false;
    });
  },
  watch: {
    current: function(newVal, oldVal) {
      if (newVal !== oldVal) {
        console.log(newVal);
        let copy = Object.assign({}, this.menuStatus);
        Object.keys(copy).forEach(key => {
          if (newVal === key) {
            copy[key] = true;
          }else{
            copy[key] = false;
          }
        });
        this.menuStatus = copy;
      }
    }
  },
  methods: {
    clickMenuItem(key) {
      if (this.isFolder(this.menu[key])) {
        let copy = Object.assign({}, this.menuStatus);
        copy[key] = copy[key] ? false : true;
        this.menuStatus = copy;
      } else {
        this.dispatch("menuRedirect", this.parent + "-" + key);
      }
    },
    isFolder: function(item) {
      return Object.keys(item).length > 1 && this.maxLevel > 1;
    },
    dispatch(ev, param) {
      var parent = this.$parent || this.$root;
      if (parent.dispatch) {
        parent.dispatch(ev, param);
      } else {
        this.$emit(ev, param);
      }
    }
  }
};
</script>
