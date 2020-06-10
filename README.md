# WeCloud
## 版本更新记录
- 0.0.7（未发布）修复导出切图格式bug
- 0.0.6 修复导出html能力递归图层bug
- 0.0.5 添加导出slice及切图能力，发布插件及自动更新能力

## 发布流程

为了插件可以发布的同时自动更新，目前采用两个远程仓库托管代码

原始代码仓库
origin: https://git.code.oa.com/wx_fed/sketchResourceHub

发布插件仓库
github: https://github.com/funfungo/sketchResourceHub

### 插件自动更新机制

在插件的描述文件 manifest.json 中定义了插件的版本
`"version": "0.0.5",`
及插件版本更新信息的线上地址
`"appcast": "https://raw.githubusercontent.com/funfungo/sketchResourceHub/master/.appcast.xml"`

sketch 启动时会查询这两个信息，判断插件是否更新来提示用户更新<br>
因此，更新插件版本时，需要更新 manifest.json 中的 version 信息，及.appcast.xml 中的版本信息

### 插件自动发布流程

利用[skpm](https://github.com/skpm/skpm) 中内置的 publish 流程完成插件自动更新的能力

1. 添加 github 远程仓库<br>
   `git add github https://github.com/funfungo/sketchResourceHub`

2. 更新 manifest.json 中的 version

3. push 最新代码到 github 仓库<br>
   `git push github`

4. skpm 发布版本<br>
   `skpm publish v版本号`

      skpm发布会执行以下流程
      - 编译打包最新的插件
      - 更新.appcast.xml文件
      - 打版本tag，发布到github

   完成发布后可以在
   https://github.com/funfungo/sketchResourceHub/releases/latest/download/WeCloud.sketchplugin.zip
   获取到最新的插件zip包

   更新后的.appcast.xml 文件也可以通过
   https://raw.githubusercontent.com/funfungo/sketchResourceHub/master/.appcast.xml
   即可实现插件的自动更新
