<template>
  <div>
    <!-- <div class="loading" v-if="loading">loading</div> -->
    <div class></div>
    <div id="test">{{test}}</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      loading: true,
      test: "hello, world",
      symbols: {},
    };
  },
  mounted() {
    window.receiveData = (data) =>{
      this.symbols = data;
      console.log(this.symbols);
    };
    window.progress = function() {
      console.log("progress");
    };

    this.init();
  },
  methods: {
    init() {
      this.setupPostMessage();
    },
    setupPostMessage() {
      window.postMessage("loadKit", "receiveData", "progress");
    },
    processData() {}
  }
};
</script>

<style lang="less">
@import "./index";
#test {
  color: brown;
}
</style>
