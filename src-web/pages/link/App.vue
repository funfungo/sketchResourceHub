<template lang="html">
  <div class="uploadIcon-wrap">
    <div>
      <p>注释</p>
      <el-input class="upload-input"
        placeholder="注释"
        @change="notesChange"
        v-model="notes">
      </el-input>
      <p>线段类型</p>
      <template>
          <el-radio v-model="radioType" label="0">类型1</el-radio>
          <el-radio v-model="radioType" label="1">类型2</el-radio>
      </template>
    </div>
    <div class="button-wrap">
      <button type="button" @click="confirmLink" class="el-button el-button--primary f-r m-l-10"><span>连线</span></button>
      <button type="button" @click="closeWindow" class="el-button el-button--default f-r m-l-10"><span>取消</span></button>
    </div>
  </div>
</template>
<script>
let id = 0;
export default {
  name: "upload",
  data: function() {
    return {
    	radioType:'0'
    }
  },
  watch: {

  },
  methods: {
    confirmLink: function() {

    },
    closeWindow: function() {

    },
    notesChange: function() {

    }
  },
  mounted: function(e) {
    
  }
};
</script>

<style lang="less">
.f-r{
  float: right;
}
.uploadIcon-wrap .upload-input{
  width: 202px !important;
}
.button-wrap{
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(13, 10, 19, 0.09);
}
.upload-cascade .el-input__inner::placeholder {
  color: #333 !important;
}
.uploadIcon-wrap{
  width: 560px;
  padding: 20px;
  overflow: hidden;
}
.svg-content{
  position: relative;
  width: 80px;
  height: 80px;
  overflow: hidden;
  background: white;
  border: 1px solid rgba(13, 10, 19, 0.09);
}
.svg-content svg{
  max-width: 80%;
  max-height: 80%;
  transform: translate(-50%,-50%);
  top: 50%;
  left: 50%;
  position: absolute;
}
.m-l-10{
  margin-left: 10px !important;
}
.o-h{
  overflow: hidden;
}
</style>
