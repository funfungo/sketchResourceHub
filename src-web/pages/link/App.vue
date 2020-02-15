<template lang="html">
  <div class="uploadIcon-wrap">
    <div>
      <p>注释</p>
      <el-input class="upload-input"
        placeholder="注释"
        type="textarea"
        row="3"
        @change="notesChange"
        v-model="linkMessage.notes">
      </el-input>
      <p>线段类型</p>
      <template>
          <el-radio v-model="linkMessage.type" label="0">实线</el-radio>
          <el-radio v-model="linkMessage.type" label="1">虚线</el-radio>
      </template>
      <p>颜色</p>
      <el-color-picker v-model="linkMessage.color" show-alpha></el-color-picker>
      <p>粗细</p>
 	  <el-input-number v-model="linkMessage.num" :min="1" :max="10" label="描述文字"></el-input-number>

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
    	linkMessage: {
    		type: '0',
    		notes: '',
    		color: '',
    		num: 6
    	}
    	
    }
  },
  watch: {

  },
  methods: {
    confirmLink: function() {
      	window.postMessage('link',JSON.parse(JSON.stringify(this.linkMessage)));
    },
    closeWindow: function() {
      window.postMessage('closeWindow','close');

    },
    notesChange: function() {

    },
    setLinkMessage: function(s) {
    	if(s){
    		this.linkMessage = s;
    	}
    }
  },
  mounted: function(e) {
    window['setLinkMessage'] = (obj) =>{
      this.setLinkMessage(obj);
    }
  }
};
</script>

<style lang="less">
.f-r{
  float: right;
}
.uploadIcon-wrap .upload-input{
  width: 232px !important;
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
  width: 320px;
  padding-left: 10px;
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
