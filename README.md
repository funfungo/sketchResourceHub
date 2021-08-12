# WeCloud Sketch Plugin
此仓库用来托管插件更新所需文件，不存储任何代码


### 0.1.4
- 修复画板中切片导出问题
### 0.1.3
- 导出画板在切片中的位置

### 0.1.2
- 修复上传woa域名

### 0.1.1
- 导出标注显示symbol名称


### 0.1.0
- 分片上传修复大文件上传失败问题（会增加整体导出时间）
- 优化导出进度显示

### 0.0.11
- 仅移动端导出3x图
- 标注仅导出artboard和symbolMaster， 去掉导出group

### 0.0.10
- 修改视觉稿导出图片为三倍图，方便移动端高清查看
- 修复图层旋转时数据错误bug
- 修复未保存文档上传报错bug


### 0.0.9
- 修复导出切图路径错误
- 修复mask layer frame rect的计算
- Shape layer不再递归导出层级样式

### 0.0.8
- 导出时添加图层背景色

### 0.0.7
- 上传分割sketch文件仅包含当前page
- 修复导出切图格式bug

### 0.0.6 修复导出html能力递归图层bug

### 0.0.5 添加导出slice及切图能力，发布插件及自动更新能力

-----------
### 插件自动更新机制

在插件的描述文件 manifest.json 中定义了插件的版本
`"version": "0.0.5",`
及插件版本更新信息的线上地址
`"appcast": "https://raw.githubusercontent.com/funfungo/sketchResourceHub/master/.appcast.xml"`

sketch 启动时会查询这两个信息，判断插件是否更新来提示用户更新<br>
因此，更新插件版本时，需要更新 manifest.json 中的 version 信息，及.appcast.xml 中的版本信息

-----
### 插件自动发布流程
因为公司要求发布到github上的代码走开源流程，因此仅使用github托管插件压缩包及更新文件。

在master分支上打tag会自动触发orange-ci的构建流程自动发布插件到github进行托管，并更新仓库文件的版本号。
```
git tag v1.0.0
git push origin v1.0.0
```
托管插件仓库地址
github: https://github.com/funfungo/sketchResourceHub





