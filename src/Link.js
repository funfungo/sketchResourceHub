import * as fs from '@skpm/fs';
import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import UI from 'sketch/ui';
import sketch from 'sketch';
const webviewIdentifier = 'sketchresourcehub.webview';

var kPluginDomain = "com.sketchplugins.wechat.link";
var lineColorKeyLink = "com.sketchplugins.wechat.linecolor";
var lineThicknessLinkKey = "com.sketchplugins.wechat.lineThicknessLink";
var selectionDom = "com.sketchplugins.wechat.selectionDom";
var selectionDom1 = "com.sketchplugins.wechat.selectionDom1";
var selectionDom2 = "com.sketchplugins.wechat.selectionDom2";
// path.setLineDash_count_phase([5,5,5],3,0);
var colorLineLink = NSUserDefaults.standardUserDefaults().objectForKey(lineColorKeyLink) || "#1AAD19";
var lineThicknessLink = NSUserDefaults.standardUserDefaults().objectForKey(lineThicknessLinkKey) || "6";
var linkObject;
var destArtboard, linkLayer2;
function getLink(context, s) {
	function rgb(a) {
		if(a.indexOf('rgba(') > -1){
			var rgba = a.replace('rgba(','').replace(')','');
			rgba = rgba.replace(/\s/g,"").split(',');
			return rgba;
		}else{
			var sColor = a.toLowerCase();
		    if (sColor.length === 4) {
		        var sColorNew = "#";
		        for (var i = 1; i < 4; i += 1) {
		            sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
		        }
		        sColor = sColorNew;
		    }
		    //处理六位的颜色值
		    var sColorChange = [];
		    for (var i = 1; i < 7; i += 2) {
		        sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
		    }
		    return sColorChange;
		}
	    
	}
	var i18 = {};


	var LineToArtJL = 200;
	var lineCollections = []; // 所有线的集合 [{ x: 1; y: 2; direction: ‘l’; position: 3 },...]


	var sanitizeArtboard = function (artboard, context) {
		if (context.command.valueForKey_onLayer_forPluginIdentifier("artboardID", artboard, kPluginDomain) == nil) {
			context.command.setValue_forKey_onLayer_forPluginIdentifier(artboard.objectID(), "artboardID", artboard, kPluginDomain);
		}
	}

	var getConnectionsGroupInPage = function (page) {
		var connectionsLayerPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).isConnectionsContainer == true", kPluginDomain);
		return page.children().filteredArrayUsingPredicate(connectionsLayerPredicate).firstObject();
	}

	function segmentsIntr0(a, b, c, d) {
		// 三角形abc 面积的2倍
		var area_abc = (a.x - c.x) * (b.y - c.y) - (a.y - c.y) * (b.x - c.x);
		// 三角形abd 面积的2倍
		var area_abd = (a.x - d.x) * (b.y - d.y) - (a.y - d.y) * (b.x - d.x);
		// 面积符号相同则两点在线段同侧,不相交 (对点在线段上的情况,本例当作不相交处理);
		if (area_abc * area_abd >= 0) {
			return false;
		}
		// 三角形cda 面积的2倍
		var area_cda = (c.x - a.x) * (d.y - a.y) - (c.y - a.y) * (d.x - a.x);
		// 三角形cdb 面积的2倍
		// 注意: 这里有一个小优化.不需要再用公式计算面积,而是通过已知的三个面积加减得出.
		var area_cdb = area_cda + area_abc - area_abd;
		if (area_cda * area_cdb >= 0) {
			return false;
		}
		return true;
	}

	function segmentsIntr(a, b, c, d) {
		a = {
			x: parseInt(a.x),
			y: parseInt(a.y)
		};
		b = {
			x: parseInt(b.x),
			y: parseInt(b.y)
		};
		var cc = {
			x: parseInt(c.x),
			y: parseInt(c.y)
		};
		var dd = {
			x: parseInt(d.x),
			y: parseInt(d.y)
		};

		var flag = 0;
		for (var i = 0; i < 4; i++) {
			if (i == 0) {
				c = {
					x: cc.x,
					y: cc.y
				};
				d = {
					x: cc.x,
					y: dd.y
				};
			} else if (i == 1) {
				c = {
					x: cc.x,
					y: cc.y
				};
				d = {
					x: dd.x,
					y: cc.y
				};
			} else if (i == 2) {
				c = {
					x: dd.x,
					y: dd.y
				};
				d = {
					x: dd.x,
					y: cc.y
				};
			} else if (i == 3) {
				c = {
					x: dd.x,
					y: dd.y
				};
				d = {
					x: cc.x,
					y: dd.y
				};
			}
			// 三角形abc 面积的2倍
			var area_abc = (a.x - c.x) * (b.y - c.y) - (a.y - c.y) * (b.x - c.x);
			// 三角形abd 面积的2倍
			var area_abd = (a.x - d.x) * (b.y - d.y) - (a.y - d.y) * (b.x - d.x);
			// 面积符号相同则两点在线段同侧,不相交 (对点在线段上的情况,本例当作不相交处理);
			if (area_abc * area_abd >= 0) {
				continue;
			}
			// 三角形cda 面积的2倍
			var area_cda = (c.x - a.x) * (d.y - a.y) - (c.y - a.y) * (d.x - a.x);
			// 三角形cdb 面积的2倍
			// 注意: 这里有一个小优化.不需要再用公式计算面积,而是通过已知的三个面积加减得出.
			var area_cdb = area_cda + area_abc - area_abd;
			if (area_cda * area_cdb >= 0) {
				continue;
			}
			var t = area_cda / (area_abd - area_abc);
			var dx = t * (b.x - a.x),
				dy = t * (b.y - a.y);
			return {
				x: a.x + dx,
				y: a.y + dy,
				flag: true
			};
		}
		return {
			flag: false
		};
	}

	var findAway = function (line, a, b, doc, endPoisiton) {
		var art = doc.artboards();
		var pca = a;
		var pcb = b;
		var lastEndPosition = endPoisiton;
		a = a.absoluteRect();
		b = b.absoluteRect();
		var returnLine = [];
		var ax = 0,
			bx = 0,
			ay = 0,
			by = 0;
		var isReturnFlag = false;
		if (a.className() != "MSArtboardGroup" && a.className() != "MSSymbolMaster") {
			if (pca.parentArtboard()) {
				pca = pca.parentArtboard();
			}
		}
		if (b.className() != "MSArtboardGroup" && b.className() != "MSSymbolMaster") {
			if (pcb.parentArtboard()) {
				pcb = pcb.parentArtboard();
			}
		}
		if (lastEndPosition == 'l') {
			ax = a.x() + a.size().width / 2;
			ay = a.y() + a.size().height;
			by = ay + LineToArtJL;
		} else if (lastEndPosition == 'r') {
			ax = a.x() + a.size().width / 2;
			ay = a.y();
			by = ay - LineToArtJL;
		} else if (lastEndPosition == 't') {
			ax = a.x() + a.size().width;
			bx = ax + LineToArtJL;
			ay = a.y() + a.size().height / 2;
		} else if (lastEndPosition == 'b') {
			ax = a.x();
			bx = ax - LineToArtJL;
			ay = a.y() + a.size().height / 2;
		}


		for (var i = 0; i < art.length; i++) {
			if (pca.objectID() != art[i].objectID() && pcb.objectID() != art[i].objectID() && segmentsIntr0({
					x: line.ax,
					y: line.ay
				}, {
					x: line.bx,
					y: line.by
				}, {
					x: art[i].absoluteRect().x(),
					y: art[i].absoluteRect().y()
				}, {
					x: art[i].absoluteRect().x() + art[i].absoluteRect().size().width,
					y: art[i].absoluteRect().y() + art[i].absoluteRect().size().height
				})) {
				isReturnFlag = true;
				if (endPoisiton == 't') {
					if (ax <= art[i].absoluteRect().x() + art[i].absoluteRect().size().width) {
						if (bx < art[i].absoluteRect().x() + art[i].absoluteRect().size().width) {
							bx = art[i].absoluteRect().x() + art[i].absoluteRect().size().width + LineToArtJL;
							by = art[i].absoluteRect().y() + art[i].absoluteRect().size().height / 2;
						}
					}
				} else if (endPoisiton == 'b') {
					if (ax >= art[i].absoluteRect().x()) {
						if (bx > art[i].absoluteRect().x()) {
							bx = art[i].absoluteRect().x() - LineToArtJL;
							by = art[i].absoluteRect().y() + art[i].absoluteRect().size().height / 2;
						}
					}
				} else if (endPoisiton == 'l') {
					if (ay <= art[i].absoluteRect().y() + art[i].absoluteRect().size().height) {
						if (by < art[i].absoluteRect().y() + art[i].absoluteRect().size().height) {
							by = art[i].absoluteRect().y() + art[i].absoluteRect().size().height + LineToArtJL;
							bx = art[i].absoluteRect().x() + art[i].absoluteRect().size().width / 2;
						}
					}
				} else if (endPoisiton == 'r') {
					if (ay >= art[i].absoluteRect().y()) {
						if (by > art[i].absoluteRect().y()) {
							by = art[i].absoluteRect().y() - LineToArtJL;
							bx = art[i].absoluteRect().x() + art[i].absoluteRect().size().width / 2;
						}
					}
				}
			}
		}
		returnLine.push({
			x: ax,
			y: ay
		});
		if (lastEndPosition == 'l') {
			if (by < b.y() + b.size().height) {
				returnLine.push({
					x: ax,
					y: by
				});
				returnLine.push({
					x: b.size().width + b.x(),
					y: by
				});
				endPoisiton = 'l';
			} else {
				returnLine.push({
					x: ax,
					y: by
				});
				returnLine.push({
					x: b.x() + b.size().width / 2,
					y: by
				});
				returnLine.push({
					x: b.x() + b.size().width / 2,
					y: b.y() + b.size().height
				});
				endPoisiton = 'b';
			}
		} else if (lastEndPosition == 'r') {
			if (by > b.y()) {
				returnLine.push({
					x: ax,
					y: by
				});
				returnLine.push({
					x: b.x(),
					y: by
				});

				endPoisiton = 'r';
			} else {
				returnLine.push({
					x: ax,
					y: by
				});
				returnLine.push({
					x: b.x() + b.size().width / 2,
					y: by
				});
				returnLine.push({
					x: b.x() + b.size().width / 2,
					y: b.y()
				});
				endPoisiton = 't';
			}
		} else if (lastEndPosition == 't') {
			if (bx < b.x() + b.size().width) {
				returnLine.push({
					x: bx,
					y: ay
				});
				returnLine.push({
					x: bx,
					y: b.y()
				});
				endPoisiton = 't';
			} else {
				returnLine.push({
					x: bx,
					y: ay
				});
				returnLine.push({
					x: bx,
					y: b.y() + b.size().height / 2
				});
				returnLine.push({
					x: b.x() + b.size().width,
					y: b.y() + b.size().height / 2
				});
				endPoisiton = 'l';
			}
		} else if (lastEndPosition == 'b') {
			if (bx > b.x()) {
				returnLine.push({
					x: bx,
					y: ay
				});
				returnLine.push({
					x: bx,
					y: b.y() + b.size().height
				});
				endPoisiton = 'b';
			} else {
				returnLine.push({
					x: bx,
					y: ay
				});
				returnLine.push({
					x: bx,
					y: b.y() + b.size().height / 2
				});
				returnLine.push({
					x: b.x(),
					y: b.y() + b.size().height / 2
				});
				endPoisiton = 'r';
			}
		}
		return {
			line: returnLine,
			flag: isReturnFlag,
			endPoisiton: endPoisiton
		}

	}

	var drawTwoLine = function (a, b, doc) {
		var art = doc.artboards();
		var pca = a;
		var pcb = b;
		var endPoisiton;
		a = a.absoluteRect();
		b = b.absoluteRect();
				var domA = a;
		var domB = b;
		var startPointX;
		var startPointY;
		var endPointX;
		var endPointY;
		var endPoisiton = 'l';
		var tempPointX;
		var tempPointY;

		if (a.className() != "MSArtboardGroup" && a.className() != "MSSymbolMaster") {
			if (pca.parentArtboard()) {
				pca = pca.parentArtboard();
			}
		}
		if (b.className() != "MSArtboardGroup" && b.className() != "MSSymbolMaster") {
			if (pcb.parentArtboard()) {
				pcb = pcb.parentArtboard();
			}
		}
		//先左右后上下
		var axPoint = a.x() + a.size().width / 2;
		var ayPoint = a.y() + a.size().height / 2;
		var tmpLinePoint = [];
		var isReturnFlag = true;
		if (b.x() > a.x() + a.size().width / 2) {
			startPointX = a.x() + a.size().width;
			startPointY = ayPoint;
			endPointX = b.x() + b.size().width / 2;
			endPointY = ayPoint;
		} else if (b.x() + b.size().width / 2 < a.x()) {
			startPointX = a.x();
			startPointY = ayPoint;
			endPointX = b.x() + b.size().width / 2;
			endPointY = ayPoint;
		}
		tmpLinePoint = [{
			x: startPointX,
			y: startPointY
		}, {
			x: endPointX,
			y: endPointY
		}];

		if (b.y() + b.size().height / 2 > ayPoint) {
			endPointY = b.y();
			endPoisiton = 't';
		} else {
			endPointY = b.y() + b.size().height;
			endPoisiton = 'b';
		}
		tmpLinePoint.push({
			x: endPointX,
			y: endPointY
		});
		for (var k = 0; k < tmpLinePoint.length - 1; k++) {
			for (var i = 0; i < art.length; i++) {
				var segments = segmentsIntr({
					x: tmpLinePoint[k].x,
					y: tmpLinePoint[k].y
				}, {
					x: tmpLinePoint[k + 1].x + 5,
					y: tmpLinePoint[k + 1].y + 5
				}, {
					x: art[i].absoluteRect().x(),
					y: art[i].absoluteRect().y()
				}, {
					x: art[i].absoluteRect().x() + art[i].absoluteRect().size().width,
					y: art[i].absoluteRect().y() + art[i].absoluteRect().size().height
				});
				if (pca.objectID() != art[i].objectID() && pcb.objectID() != art[i].objectID() && segments.flag == true) {
					isReturnFlag = false;
				}
			}
		}
		//先上下后左右
		if (!isReturnFlag) {
			tmpLinePoint.splice(0, tmpLinePoint.length);
			isReturnFlag = true;
			if (b.y() + b.size().height / 2 > ayPoint) {
				startPointY = a.y() + a.size().height;
			} else {
				startPointY = a.y();
			}
			startPointX = a.x() + a.size().width / 2;
			endPointX = startPointX;
			endPointY = b.y() + b.size().height / 2;
			tmpLinePoint = [{
				x: startPointX,
				y: startPointY
			}, {
				x: endPointX,
				y: endPointY
			}];
			if (b.x() > a.x() + a.size().width / 2) {
				endPointX = b.x();
				endPoisiton = 'r';
			} else {
				endPointX = b.x() + b.size().width;
				endPoisiton = 'l';
			}
			tmpLinePoint.push({
				x: endPointX,
				y: endPointY
			});
			for (var k = 0; k < tmpLinePoint.length - 1; k++) {
				for (var i = 0; i < art.length; i++) {
					var segments = segmentsIntr({
						x: tmpLinePoint[k].x,
						y: tmpLinePoint[k].y
					}, {
						x: tmpLinePoint[k + 1].x + 5,
						y: tmpLinePoint[k + 1].y + 5
					}, {
						x: art[i].absoluteRect().x(),
						y: art[i].absoluteRect().y()
					}, {
						x: art[i].absoluteRect().x() + art[i].absoluteRect().size().width,
						y: art[i].absoluteRect().y() + art[i].absoluteRect().size().height
					});
					if (pca.objectID() != art[i].objectID() && pcb.objectID() != art[i].objectID() && segments.flag == true) {
						isReturnFlag = false;
					}
				}
			}
		}

		return {
			line: tmpLinePoint,
			flag: isReturnFlag,
			endPoisiton: endPoisiton
		}
	}

	var findAway2 = function (a, b, doc) {
		var endPoisitonArrow = 'b';
		var art = doc.artboards();
		var returnLine = [];
		var isReturnFlag = false;
		var pca = a,
			pcb = b;
		var fx;
		var zaLength = 0;
		if (a.className() != "MSArtboardGroup" && a.className() != "MSSymbolMaster") {
			if (a.parentArtboard()) {
				pca = pca.parentArtboard();
			}
		}
		if (b.className() != "MSArtboardGroup" && b.className() != "MSSymbolMaster") {
			if (pcb.parentArtboard()) {
				pcb = pcb.parentArtboard();
			}
		}
		a = a.absoluteRect();
		b = b.absoluteRect();

		//确认位置关系 并确定起始点
		var qda = [];
		var ax, bx, ay, by, nx, ny;
		var linePath = [];
		var iFlag = 0;

		//左右
		if (b.x() > a.x()) {
			ax = a.size().width + a.x();
			ay = a.size().height / 2 + a.y();
			bx = b.x() + 5;
			by = b.size().height / 2 + b.y();
			fx = 'r';
			returnLine.push({
				x: parseInt(ax),
				y: parseInt(ay)
			});
			if (b.y() > a.y()) {
				// 目标在右下角 右下右
				getLinePath({
					x: ax,
					y: ay
				}, {
					x: bx,
					y: by
				}, fx, 'b');
			} else {
				// 目标在右上角 右上右
				getLinePath({
					x: ax,
					y: ay
				}, {
					x: bx,
					y: by
				}, fx, 't');
			}
		} else {
			ax = a.x() - 5;
			ay = a.size().height / 2 + a.y();
			bx = b.size().width + b.x();
			by = b.size().height / 2 + b.y();
			fx = 'l';
			returnLine.push({
				x: parseInt(ax),
				y: parseInt(ay)
			});
			if (b.y() > a.y()) {
				// 目标在左下角 左下左
				getLinePath({
					x: ax,
					y: ay
				}, {
					x: bx,
					y: by
				}, fx, 'b');
			} else {
				// 目标在左上角 左上左
				getLinePath({
					x: ax,
					y: ay
				}, {
					x: bx,
					y: by
				}, fx, 't');
			}
		}

		function getLinePath(startPosition, endPoisiton, fx, nextFx) {
			iFlag = iFlag + 1;
			if (iFlag == 15) {
				return iFlag++;
			}
			//找到路径中最近的产生碰撞的元素
			var pzysx = 0;
			var pzysy = 0;
			var isPZ = false;
			var thisEndPosition = {
				x: parseInt(startPosition.x),
				y: parseInt(startPosition.y)
			};
			var PZLine = {
				x: parseInt(endPoisiton.x),
				y: parseInt(endPoisiton.y)
			};

			if (fx == 'l' || fx == 'r') {
				PZLine.y = startPosition.y;
				if (fx == 'l') {
					PZLine.x = PZLine.x - pcb.absoluteRect().size().width / 2;
				} else {
					PZLine.x = PZLine.x + pcb.absoluteRect().size().width / 2;
				}
			} else if (fx == 't' || fx == 'b') {
				PZLine.x = startPosition.x;
				if (fx == 't') {
					PZLine.y = PZLine.y - pcb.absoluteRect().size().height / 2;
				} else {
					PZLine.y = PZLine.y + pcb.absoluteRect().size().height / 2;
				}
			}

			var startArtPosition = pca.absoluteRect();
			for (var i = 0; i < art.length; i++) {
				var segments = segmentsIntr({
						x: startPosition.x,
						y: startPosition.y
					},
					PZLine, {
						x: art[i].absoluteRect().x(),
						y: art[i].absoluteRect().y()
					}, {
						x: art[i].absoluteRect().x() + art[i].absoluteRect().size().width,
						y: art[i].absoluteRect().y() + art[i].absoluteRect().size().height
					}
				);
				if (pca.objectID() != art[i].objectID() && pcb.objectID() != art[i].objectID() && segments.flag == true) {

					//需要一个绕过的情况

					isReturnFlag = true;
					if ((pzysx < art[i].absoluteRect().x() + art[i].absoluteRect().size().width || !isPZ) && fx == 'l') {
						pzysx = parseInt(art[i].absoluteRect().x() + art[i].absoluteRect().size().width);
						thisEndPosition.x = parseInt(startArtPosition.x() - (startArtPosition.x() - (art[i].absoluteRect().x() + art[i].absoluteRect().size().width)) / 2);
						if (thisEndPosition.x == startPosition.x && thisEndPosition.y == startPosition.y) {
							if (nextFx == 'b') {
								returnLine.splice(returnLine.length - 1, 1);
								thisEndPosition.y = art[i].absoluteRect().y() - LineToArtJL;
							} else if (nextFx == 't') {
								returnLine.splice(returnLine.length - 1, 1);
								thisEndPosition.y = art[i].absoluteRect().y() + art[i].absoluteRect().size().height + LineToArtJL;
							}
							returnLine.push({
								x: parseInt(thisEndPosition.x),
								y: parseInt(thisEndPosition.y)
							});
							getLinePath(thisEndPosition, endPoisiton, fx, nextFx);
							return;
						}
					} else if ((pzysx > art[i].absoluteRect().x() || !isPZ) && fx == 'r') {
						pzysx = art[i].absoluteRect().x();
						thisEndPosition.x = parseInt(startArtPosition.x() + startArtPosition.size().width + (art[i].absoluteRect().x() - startArtPosition.x() - startArtPosition.size().width) / 2);
						if (thisEndPosition.x == startPosition.x && thisEndPosition.y == startPosition.y) {
							if (nextFx == 'b') {
								returnLine.splice(returnLine.length - 1, 1);
								thisEndPosition.y = art[i].absoluteRect().y() - LineToArtJL;
							} else if (nextFx == 't') {
								returnLine.splice(returnLine.length - 1, 1);
								thisEndPosition.y = art[i].absoluteRect().y() + art[i].absoluteRect().size().height + LineToArtJL;
							}
							returnLine.push({
								x: parseInt(thisEndPosition.x),
								y: parseInt(thisEndPosition.y)
							});
							getLinePath(thisEndPosition, endPoisiton, fx, nextFx);
							return;
						}
					} else if ((pzysy > art[i].absoluteRect().y() + art[i].absoluteRect().size().height || !isPZ) && fx == 't') {
						pzysy = art[i].absoluteRect().y() + art[i].absoluteRect().size().height;
						thisEndPosition.y = parseInt(startPosition.y - (startPosition.y - (art[i].absoluteRect().y() + art[i].absoluteRect().size().height)) / 2);

					} else if ((pzysy > art[i].absoluteRect().y() || !isPZ) && fx == 'b') {
						pzysy = art[i].absoluteRect().y();
						thisEndPosition.y = parseInt(startPosition.y + (art[i].absoluteRect().y() - startPosition.y) / 2);
					}
					isPZ = true;
				}
			}
			var endObject = {};

			if (isPZ) {
				if (fx == 'l' || fx == 'r') {
					zaLength++;
				} else {
					zaLength--;
				}
				if (zaLength > 0) {
					if (b.x() > a.x()) {
						endPoisiton.x = b.x() + 10;
						endPoisiton.y = b.size().height / 2 + b.y();
					} else {
						endPoisiton.x = b.size().width + b.x() - 10;
						endPoisiton.y = b.size().height / 2 + b.y();
					}
				} else {
					if (b.y() < a.y()) {
						endPoisiton.x = b.x() + b.size().width / 2;
						endPoisiton.y = b.y() + b.size().height - 10;
					} else {
						endPoisiton.x = b.x() + b.size().width / 2;
						endPoisiton.y = b.y() + 10;
					}
				}
				endObject = {
					x: parseInt(thisEndPosition.x),
					y: parseInt(thisEndPosition.y)
				};
				pzysx = 0;
				pzysy = 0;
			} else {
				if (fx == 'l' || fx == 'r') {
					endObject = {
						x: parseInt(endPoisiton.x),
						y: parseInt(startPosition.y)
					};
				} else if (fx == 't' || fx == 'b') {
					endObject = {
						x: parseInt(startPosition.x),
						y: parseInt(endPoisiton.y)
					};
				}
			}


			if (returnLine[returnLine.length - 1].x != endObject.x || returnLine[returnLine.length - 1].y != endObject.y) {
				returnLine.push(endObject);
				//判断是不是撞到目标了
				for (var i = 0; i < art.length; i++) {
					var segments = segmentsIntr({
							x: startPosition.x,
							y: startPosition.y
						},
						endObject, {
							x: art[i].absoluteRect().x(),
							y: art[i].absoluteRect().y()
						}, {
							x: art[i].absoluteRect().x() + art[i].absoluteRect().size().width,
							y: art[i].absoluteRect().y() + art[i].absoluteRect().size().height
						}
					);
					if (pcb.objectID() == art[i].objectID() && segments.flag == true) {
						returnLine.splice(returnLine.length - 1, 1);
						returnLine.push({
							x: parseInt(segments.x),
							y: parseInt(segments.y)
						});
						if (fx == 'b') {
							endPoisitonArrow = 't';
						} else if (fx == 't') {
							endPoisitonArrow = 'b';
						} else {
							endPoisitonArrow = fx;
						}
						return;
					}
				}
			} else {
				returnLine.splice(returnLine.length - 1, 1);
			}

			if (parseInt(endObject.x) != parseInt(endPoisiton.x) || parseInt(endObject.y) != parseInt(endPoisiton.y)) {
				getLinePath(endObject, endPoisiton, nextFx, fx);
			} else {
				endPoisitonArrow = fx;
				if (fx == 'b') {
					endPoisitonArrow = 't';
				} else if (fx == 't') {
					endPoisitonArrow = 'b';
				}
			}
		}
		if (iFlag == 16) {
			errorDialog(context,pca.name() + i18.m1 + pcb.name() + i18.m2);
		}

		return {
			line: returnLine,
			flag: isReturnFlag,
			endPoisiton: endPoisitonArrow
		}
	}

	var drawPPP = function (a, b, doc) {
		var domA = a;
		var domB = b;
		a = a.absoluteRect();
		b = b.absoluteRect();
		var startPointX;
		var startPointY;
		var endPointX;
		var endPointY;
		var endPoisiton = 'l';
		var tempPointX;
		var tempPointY;

		//先确定是否可以走直线
		var axPoint = a.x() + a.size().width / 2;
		var ayPoint = a.y() + a.size().height / 2;

		//是否是上下关系
		if (b.x() < axPoint && axPoint < b.x() + b.size().width) {
			startPointX = axPoint;
			endPointX = axPoint;
			var plus = true;
			//在上边
			if (a.y() > b.y()) {
				startPointY = a.y();
				endPointY = b.y() + b.size().height;
				endPoisiton = 'b';
			} else {
				//在下边
				startPointY = a.y() + a.size().height;
				endPointY = b.y();
				endPoisiton = 't';
				plus = false;
			}
			var line;
			var returnLine = findAway({
				ax: startPointX,
				ay: startPointY,
				bx: endPointX,
				by: endPointY
			}, domA, domB, doc, endPoisiton);
			//三根线算法
			if (returnLine.flag) {
				startPointX = returnLine.line[0].x;
				startPointY = returnLine.line[0].y;
				endPointX = returnLine.line[returnLine.line.length - 1].x;
				endPointY = returnLine.line[returnLine.line.length - 1].y;
				line = drawLine(returnLine.line, endPoisiton, true);
				endPoisiton = returnLine.endPoisiton;
			} else {
				line = drawLine([{
					x: startPointX,
					y: startPointY
				}, {
					x: endPointX,
					y: endPointY
				}], endPoisiton);
			}
		}
		//是否是左右关系
		else if (b.y() < ayPoint && ayPoint < b.y() + b.size().height) {
			startPointY = ayPoint;
			endPointY = ayPoint;
			var plus = true;
			if (a.x() > b.x()) {
				//在右边
				startPointX = a.x();
				endPointX = b.x() + b.size().width;
				endPoisiton = 'l';
			} else {
				//在左边
				startPointX = a.x() + a.size().width;
				endPointX = b.x();
				endPoisiton = 'r';
				plus = false;
			}
			var line;
			var returnLine = findAway({
				ax: startPointX,
				ay: startPointY,
				bx: endPointX,
				by: endPointY
			}, domA, domB, doc, endPoisiton);
			//三根线算法
			if (returnLine.flag) {
				line = drawLine(returnLine.line, returnLine.endPoisiton, true);
			} else {
				line = drawLine([{
					x: startPointX,
					y: startPointY
				}, {
					x: endPointX,
					y: endPointY
				}], endPoisiton);
			}
		}
		// 都不是，要用两根线了
		else if (b.y() + b.size().height / 2 < ayPoint || b.y() + b.size().height / 2 > ayPoint) {
			var returnLine = drawTwoLine(domA, domB, doc);
			if (returnLine.flag == false) {
				returnLine = findAway2(domA, domB, doc);
			}
			line = drawLine(returnLine.line, returnLine.endPoisiton, true);


		}
		return line;
	}

	/*
	 * 获取两个点（有顺序的点）连成线的方向
	 */
	var getLineDirection = function (pointeOne, pointTwo) {
		if (pointeOne.x === pointTwo.x) { // 两个点的 x 相同
			if (pointeOne.y > pointTwo.y) { // 上
				return 't';
			} else { // 下
				return 'b';
			}
		} else { // 两个点的 y 相同
			if (pointeOne.x > pointTwo.x) { // 左
				return 'l';
			} else { // 右
				return 'r';
			}
		}
	}

	/*
	 * 获取两个点（有顺序的点）连成线的位置
	 */
	var getLinePosition = function (point) {
		if (point.direction == 't' || point.direction == 'b') {
			return point.x;
		} else {
			return point.y;
		}
	}

	var isCoincidenis = function (a,b) {
		var c = {a:Math.min(a.a,a.b),b:Math.min(a.a,a.b)};
		var d = {a:Math.min(b.a,b.b),b:Math.min(b.a,b.b)};
		if((c.a >= d.a && c.a <= d.b) || (c.b >= d.a && c.b <= d.b)){
			return true;
		}else{
			return false;
		}
	}

	var drawLine = function (linepoint, endPoisiton, isLess) {
		var colorArray = rgb(colorLineLink);
		var colorLineLinkR = colorArray[0];
		var colorLineLinkG = colorArray[1];
		var colorLineLinkB = colorArray[2];
		var colorLineLinkA = 255;
		if(colorArray.length > 3){
			colorLineLinkA = parseInt(colorArray[3] * 255);
		}
		var linePaths = [];
		var linePath = NSBezierPath.bezierPath();
		var lineCount = linepoint.length;
		var offset = 20;
		var coincideOffset = lineThicknessLink * 5;

		for (var i = 0; i < lineCount - 1; i++) { // 给每个点添加接下来走向的方向和位置属性
			linepoint[i].direction = getLineDirection(linepoint[i], linepoint[i + 1]);
			linepoint[i].position = getLinePosition(linepoint[i]);
			lineCollections.push(linepoint[i]);
		}

		var comparedLineCollectionCount = lineCollections.length - (lineCount - 1);

		// 解决线重合问题
		for (var i = 0; i < lineCount; i++) {
			for (var j = 0; j < comparedLineCollectionCount; j++) {
				if ((linepoint[i].direction == 't' || linepoint[i].direction == 'b') &&
					(Math.abs(linepoint[i].position - lineCollections[j].position) < 3) && isCoincidenis({a:linepoint[i].x,b:linepoint[i+1].x},{a:lineCollections[j].x,b:lineCollections[j+1].x})) {
					// 不是起始线重合，位于起始点左侧 || 起始线重合: 位于重合线下侧，减去 coincideOffset
					if ((i != 0 && linepoint[0].x < linepoint[i].x) ||
						(i == 0 && (linepoint[0].y < lineCollections[j].y))) {
						linepoint[i].x -= coincideOffset;
						linepoint[i + 1].x -= coincideOffset;
					} else {
						linepoint[i].x += coincideOffset;
						linepoint[i + 1].x += coincideOffset;
					}
				} else if ((linepoint[i].direction == 'l' || linepoint[i].direction == 'r') &&
					(Math.abs(linepoint[i].position - lineCollections[j].position) < 3) && isCoincidenis({a:linepoint[i].y,b:linepoint[i+1].y},{a:lineCollections[j].y,b:lineCollections[j+1].y})) {
					// 不是起始线重合，位于起始点上侧 || 起始线重合: 位于重合线左侧，减去 coincideOffset
					if ((i != 0 && linepoint[0].y < linepoint[i].y) ||
						(i == 0 && linepoint[0].x < lineCollections[j].x)) {
						linepoint[i].y -= coincideOffset;
						linepoint[i + 1].y -= coincideOffset;
					} else {
						linepoint[i].y += coincideOffset;
						linepoint[i + 1].y += coincideOffset;
					}
				} else {}
			}
		}

		//计算需要的
		log(linepoint);

		var LinePointArrLocation = (parseInt(linepoint.length/2));
		var textArr = linkObject.notes.split('\n');
		var longLength = 0;
		var LinePointArrLocationObj = {
			direction: linepoint[LinePointArrLocation-1].direction,
			position: linepoint[LinePointArrLocation-1].position,
			x: linepoint[LinePointArrLocation-1].x + ((linepoint[LinePointArrLocation].x - linepoint[LinePointArrLocation-1].x)/2),
			y: linepoint[LinePointArrLocation-1].y + ((linepoint[LinePointArrLocation].y - linepoint[LinePointArrLocation-1].y)/2)
		}

		//判断最长一排的长度
		for(var i = 0;i < textArr.length; i++){
			if(textArr[i].length > longLength){
				longLength = textArr[i].replace(/[\u0391-\uFFE5]/g,"aa").length;
			}
		}

		if(LinePointArrLocationObj.direction == 'l' || LinePointArrLocationObj.direction == 'r'){
			LinePointArrLocationObj.y = LinePointArrLocationObj.y - 30 - textArr.length * 24;
			LinePointArrLocationObj.x = LinePointArrLocationObj.x - longLength * 5;
		}else{
			LinePointArrLocationObj.x = LinePointArrLocationObj.x + 20;
			LinePointArrLocationObj.y = LinePointArrLocationObj.y - longLength * 12;
		}

		var textLayer = MSTextLayer.alloc().init();

		textLayer.absoluteRect().setX(LinePointArrLocationObj.x);
		textLayer.absoluteRect().setY(LinePointArrLocationObj.y);
		textLayer.setName('Label');
		var fixedBehaviour = 1;
		textLayer.setTextBehaviour(fixedBehaviour);
		textLayer.setStringValue(linkObject.notes);
		textLayer.setTextColor(MSImmutableColor.colorWithIntegerRed_green_blue_alpha(colorLineLinkR, colorLineLinkG, colorLineLinkB, colorLineLinkA).newMutableCounterpart());
		textLayer.setFontSize(20);

		

		for (var i = 0; i < lineCount - 1; i++) {
			if (i === 0) { // 第一个点不做修改
				linePath.moveToPoint(NSMakePoint(linepoint[i].x, linepoint[i].y));
			}
			if (i === lineCount - 2) { // 倒数第二个点绘制直线
				linePath.lineToPoint(NSMakePoint(linepoint[i + 1].x, linepoint[i + 1].y));
			} else {
				// 先绘制到下一个点的直线，然后绘制到下下个点的曲线
				// 0.13 = 1 - cos(30)
				// 0.5 = 1- sin(30)
				if (linepoint[i].direction === 't') { // 上
					linePath.lineToPoint(NSMakePoint(linepoint[i + 1].x, linepoint[i + 1].y + offset));
					// 绘制过渡曲线
					if (linepoint[i + 1].direction === 'l') { // 下一条线的方向 左
						linePath.curveToPoint_controlPoint1_controlPoint2(NSMakePoint(linepoint[i + 1].x - offset, linepoint[i + 1].y), NSMakePoint(linepoint[i + 1].x - offset * 0.13, linepoint[i + 1].y + offset * 0.5), NSMakePoint(linepoint[i + 1].x - offset * 0.5, linepoint[i + 1].y + offset * 0.13));
					} else { // 右
						linePath.curveToPoint_controlPoint1_controlPoint2(NSMakePoint(linepoint[i + 1].x + offset, linepoint[i + 1].y), NSMakePoint(linepoint[i + 1].x + offset * 0.13, linepoint[i + 1].y + offset * 0.5), NSMakePoint(linepoint[i + 1].x + offset * 0.5, linepoint[i + 1].y + offset * 0.13));
					}
				} else if (linepoint[i].direction === 'b') { // 下
					linePath.lineToPoint(NSMakePoint(linepoint[i + 1].x, linepoint[i + 1].y - offset));
					// 绘制过渡曲线
					if (linepoint[i + 1].direction === 'l') { // 下一条线的方向 左
						linePath.curveToPoint_controlPoint1_controlPoint2(NSMakePoint(linepoint[i + 1].x - offset, linepoint[i + 1].y), NSMakePoint(linepoint[i + 1].x - offset * 0.13, linepoint[i + 1].y - offset * 0.5), NSMakePoint(linepoint[i + 1].x - offset * 0.5, linepoint[i + 1].y - offset * 0.13));
					} else { // 右
						linePath.curveToPoint_controlPoint1_controlPoint2(NSMakePoint(linepoint[i + 1].x + offset, linepoint[i + 1].y), NSMakePoint(linepoint[i + 1].x + offset * 0.13, linepoint[i + 1].y - offset * 0.5), NSMakePoint(linepoint[i + 1].x + offset * 0.5, linepoint[i + 1].y - offset * 0.13));
					}
				} else if (linepoint[i].direction === 'l') { // 左
					linePath.lineToPoint(NSMakePoint(linepoint[i + 1].x + offset, linepoint[i + 1].y));
					// 绘制过渡曲线
					if (linepoint[i + 1].direction === 't') { // 下一条线的方向 上
						linePath.curveToPoint_controlPoint1_controlPoint2(NSMakePoint(linepoint[i + 1].x, linepoint[i + 1].y - offset), NSMakePoint(linepoint[i + 1].x + offset * 0.5, linepoint[i + 1].y - offset * 0.13), NSMakePoint(linepoint[i + 1].x + offset * 0.13, linepoint[i + 1].y - offset * 0.5));
					} else { // 下
						linePath.curveToPoint_controlPoint1_controlPoint2(NSMakePoint(linepoint[i + 1].x, linepoint[i + 1].y + offset), NSMakePoint(linepoint[i + 1].x + offset * 0.5, linepoint[i + 1].y + offset * 0.13), NSMakePoint(linepoint[i + 1].x + offset * 0.13, linepoint[i + 1].y + offset * 0.5));
					}
				} else { // 右
					linePath.lineToPoint(NSMakePoint(linepoint[i + 1].x - offset, linepoint[i + 1].y));
					// 绘制过渡曲线
					if (linepoint[i + 1].direction === 't') { // 下一条线的方向 上
						linePath.curveToPoint_controlPoint1_controlPoint2(NSMakePoint(linepoint[i + 1].x, linepoint[i + 1].y - offset), NSMakePoint(linepoint[i + 1].x - offset * 0.5, linepoint[i + 1].y - offset * 0.13), NSMakePoint(linepoint[i + 1].x - offset * 0.13, linepoint[i + 1].y - offset * 0.5));
					} else { // 下
						linePath.curveToPoint_controlPoint1_controlPoint2(NSMakePoint(linepoint[i + 1].x, linepoint[i + 1].y + offset), NSMakePoint(linepoint[i + 1].x - offset * 0.5, linepoint[i + 1].y + offset * 0.13), NSMakePoint(linepoint[i + 1].x - offset * 0.13, linepoint[i + 1].y + offset * 0.5));
					}
				}
			}
		}
		var lineSh = MSShapePathLayer.layerWithPath(MSPath.pathWithBezierPath(linePath));
		var hitAreaBorder = lineSh.style().addStylePartOfType(1);

		if(linkObject && linkObject.type == 1){
			lineSh.style().borderOptions().dashPattern = [20,5,20,5];
		}

		hitAreaBorder.setColor(MSImmutableColor.colorWithIntegerRed_green_blue_alpha(colorLineLinkR, colorLineLinkG, colorLineLinkB, colorLineLinkA).newMutableCounterpart());
		hitAreaBorder.setThickness(lineThicknessLink);
		hitAreaBorder.setPosition(0);
		lineSh.setName('Line');

		// 绘制起点圆圈
		var drawRound = function (x, y) {
			var linkRect = NSInsetRect(NSMakeRect(x, y, 0, 0), -5, -5);
			// path = MSPath.pathWithBezierPath(path);

			var hitAreaLayer = MSOvalShape.alloc().initWithFrame(linkRect);
			hitAreaLayer.style().addStylePartOfType(0).setColor(MSImmutableColor.colorWithIntegerRed_green_blue_alpha(colorLineLinkR, colorLineLinkG, colorLineLinkB, parseInt(colorLineLinkA * 0.3)).newMutableCounterpart());
			hitAreaLayer.style().addStylePartOfType(1).setColor(MSImmutableColor.colorWithIntegerRed_green_blue_alpha(colorLineLinkR, colorLineLinkG, colorLineLinkB, colorLineLinkA).newMutableCounterpart());
			hitAreaLayer.setName('Point');
			return hitAreaLayer;
		}

		// 绘制终点箭头
		var drawArrow = function (x, y, z) {
			// 绘制箭头
			var arrowDirection = z; // 1. 箭头方向
			var arrowOffset = 20 * (lineThicknessLink / 6); // 2. 箭头长度
			var arrowPath = NSBezierPath.bezierPath();

			arrowPath.moveToPoint(NSMakePoint(x, y));
			if (arrowDirection == 't') {
				arrowPath.lineToPoint(NSMakePoint(x - arrowOffset, y + arrowOffset));
				arrowPath.lineToPoint(NSMakePoint(x, y));
				arrowPath.lineToPoint(NSMakePoint(x + arrowOffset, y + arrowOffset));
			} else if (arrowDirection == 'b') {
				arrowPath.lineToPoint(NSMakePoint(x - arrowOffset, y - arrowOffset));
				arrowPath.lineToPoint(NSMakePoint(x, y));
				arrowPath.lineToPoint(NSMakePoint(x + arrowOffset, y - arrowOffset));
			} else if (arrowDirection == 'l') {
				arrowPath.lineToPoint(NSMakePoint(x + arrowOffset, y - arrowOffset));
				arrowPath.lineToPoint(NSMakePoint(x, y));
				arrowPath.lineToPoint(NSMakePoint(x + arrowOffset, y + arrowOffset));
			} else {
				arrowPath.lineToPoint(NSMakePoint(x - arrowOffset, y - arrowOffset));
				arrowPath.lineToPoint(NSMakePoint(x, y));
				arrowPath.lineToPoint(NSMakePoint(x - arrowOffset, y + arrowOffset));
			}
			// arrowPath = MSPath.pathWithBezierPath(arrowPath);

			var arrow = MSShapePathLayer.layerWithPath(MSPath.pathWithBezierPath(arrowPath));
			var arrowStyle = arrow.style().addStylePartOfType(1);
			if(linkObject && linkObject.type == 1){
				arrow.style().borderOptions().dashPattern = [20,5,20,5];
			}
			arrowStyle.setThickness(lineThicknessLink);
			arrowStyle.setColor(MSImmutableColor.colorWithIntegerRed_green_blue_alpha(colorLineLinkR, colorLineLinkG, colorLineLinkB, colorLineLinkA).newMutableCounterpart());
			arrow.setName('Arrow');
			return arrow;
		}

		var startRound = drawRound(linepoint[0].x, linepoint[0].y);

		var endArrow = drawArrow(linepoint[lineCount - 1].x, linepoint[lineCount - 1].y, linepoint[lineCount - 2].direction);
		// 
		return [lineSh,  startRound , endArrow, textLayer];
	}

	var drawConnections = function (connection, doc) {
		var draw = drawPPP(connection.linkRect, connection.artboard, doc);
		

		doc.addLayers(draw);

		var connectionLayersDom = MSLayerArray.arrayWithLayers(draw);
		connectionsGroup = MSLayerGroup.groupWithLayers(connectionLayersDom);
		connectionsGroup.setName(connection.linkRect.objectID());
		return connectionsGroup;
	}

	var redrawConnections = function (context) {
		var doc = context.document;
		var selectionLayer = context.selection;

		//var selectedLayers = doc.findSelectedLayers();
		var linkLayersPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).destinationArtboardID != nil", kPluginDomain),
		linkLayers = doc.currentPage().children().filteredArrayUsingPredicate(linkLayersPredicate),
		loop = linkLayers.objectEnumerator(),
		connections = [],
		linkLayer, destinationArtboardID, destinationArtboard, isCondition, linkRect;

		var connectionsGroup = getConnectionsGroupInPage(doc.currentPage());
		if (connectionsGroup) {
			connectionsGroup.removeFromParent();
		}

		while (linkLayer = loop.nextObject()) {
			destinationArtboardID = context.command.valueForKey_onLayer_forPluginIdentifier("destinationArtboardID", linkLayer, kPluginDomain);
			linkObject = JSON.parse(context.command.valueForKey_onLayer_forPluginIdentifier("artboardMessage", linkLayer, kPluginDomain));
			var Message = destinationArtboardID.split('____');
			destinationArtboard = doc.currentPage().children().filteredArrayUsingPredicate(NSPredicate.predicateWithFormat("(objectID == %@) || (userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).artboardID == %@)", Message[1], kPluginDomain, Message[1])).firstObject();

			if (destinationArtboard && Message[0] == linkLayer.objectID()) {
				sanitizeArtboard(destinationArtboard, context);
				connections.push(drawConnections({
					linkRect: linkLayer,
					artboard: destinationArtboard
				}, doc.currentPage()));
			}
		}

		var connectionLayers = MSLayerArray.arrayWithLayers(connections);
		connectionsGroup = MSLayerGroup.groupWithLayers(connectionLayers);
		connectionsGroup.setName("Connections");
		connectionsGroup.setIsLocked(1);
		context.command.setValue_forKey_onLayer_forPluginIdentifier(true, "isConnectionsContainer", connectionsGroup, kPluginDomain);

		for (var i = 0; i < context.selection.length; i++) {
			context.selection[i].select_byExpandingSelection(false, false);
		}

		for (var i = 0; i < selectionLayer.count(); i++) {
			selectionLayer[i].select_byExpandingSelection(true, true);
		}

		return connectionsGroup;
	}

var selection = context.selection;

// 检查有没有被手动删掉的
var connectionsGroup = getConnectionsGroupInPage(context.document.currentPage());
if (!connectionsGroup) {
	var linkLayersPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).destinationArtboardID != nil", kPluginDomain),
	linkLayers = context.document.currentPage().children().filteredArrayUsingPredicate(linkLayersPredicate),
	loop = linkLayers.objectEnumerator(),
	linkLayer, destinationArtboardID;
	while (linkLayer = loop.nextObject()) {
		context.command.setValue_forKey_onLayer_forPluginIdentifier(nil, "destinationArtboardID", linkLayer, kPluginDomain);
	}
}else{
	var linkLayersPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).destinationArtboardID != nil", kPluginDomain),
	linkLayers = context.document.currentPage().children().filteredArrayUsingPredicate(linkLayersPredicate),
	loop = linkLayers.objectEnumerator(),
	linkLayer, destinationArtboardID;
	var child = connectionsGroup.layers();
	while (linkLayer = loop.nextObject()) {
		for(var i = 0;i < child.length; i++){
			if(encodeURIComponent(child[i].name()) == encodeURIComponent(linkLayer.objectID())){
				break;
			}
			if(i == child.length-1){
				context.command.setValue_forKey_onLayer_forPluginIdentifier(nil, "destinationArtboardID", linkLayer, kPluginDomain);
			}
		}
	}		
}

if (selection.count() != 1 && selection.count() != 2) {
	return redrawConnections(context);
	// if (!refursh) {
	// 	return errorDialog(context,i18.m3);
	// }
}

if (selection.count() == 1) {
	var loop = context.selection.objectEnumerator(),
		linkLayer, destinationArtboardID;
	while (linkLayer = loop.nextObject()) {
		destinationArtboardID = context.command.valueForKey_onLayer_forPluginIdentifier("destinationArtboardID", linkLayer, kPluginDomain);
		if (!destinationArtboardID) {
			continue;
		}
		context.command.setValue_forKey_onLayer_forPluginIdentifier(nil, "destinationArtboardID", linkLayer, kPluginDomain);
	}

} else if (selection.count() == 2) {
	var artboardID = destArtboard.objectID();
	context.command.setValue_forKey_onLayer_forPluginIdentifier(artboardID, "artboardID", destArtboard, kPluginDomain);
	context.command.setValue_forKey_onLayer_forPluginIdentifier(linkLayer2.objectID() + '____' + artboardID, "destinationArtboardID", linkLayer2, kPluginDomain);
}

redrawConnections(context);
}


export default function() {
	var doc = context.document;
	var selection = context.selection;
	if(selection.length < 2){
		return getLink(context);
	}

	const options = {
		parent: sketch.getSelectedDocument(),
		identifier: webviewIdentifier,
		width: 360,
		height: 500,
		frame: false,
		minimizable: false,
		maximizable: false,
		alwaysOnTop: true,
		show: false,
		acceptsFirstMouse: true
	};

    const browserWindow = new BrowserWindow(options);

	browserWindow.once('ready-to-show', () => {
	    browserWindow.show();
	});

	const webContents = browserWindow.webContents;
	webContents.on('did-finish-load', () => {
		if (selection.firstObject().className() == "MSArtboardGroup" || selection.firstObject().className() == "MSSymbolMaster") {
			if ((selection.firstObject().className() == "MSArtboardGroup" || selection.firstObject().className() == "MSSymbolMaster") && (selection.lastObject().className() == "MSArtboardGroup" || selection.lastObject().className() == "MSSymbolMaster")) {
				linkLayer2 = selection[1];
				destArtboard = selection[0];
			} else {
				destArtboard = selection[0];
				linkLayer2 = selection[1];
			}
		} else if (selection.lastObject().className() == "MSArtboardGroup" || selection.lastObject().className() == "MSSymbolMaster") {
			destArtboard = selection.lastObject();
			linkLayer2 = selection.firstObject();
		} else {
			var manifestPath = context.plugin.url().URLByAppendingPathComponent("Contents").URLByAppendingPathComponent("Sketch").URLByAppendingPathComponent("manifest.json").path(),
				manifest = NSJSONSerialization.JSONObjectWithData_options_error(NSData.dataWithContentsOfFile(manifestPath), NSJSONReadingMutableContainers, nil);

			if (JSON.stringify(manifest.commands[0]).indexOf('SelectionChanged.finish') > -1) {
				var Selection = NSUserDefaults.standardUserDefaults().objectForKey(selectionDom) || '';
				Selection = Selection.split(',');
				var linkLayersPredicate = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).selection1 == '" + Selection[0] + "'", selectionDom1);
				linkLayer2 = context.document.currentPage().children().filteredArrayUsingPredicate(linkLayersPredicate).firstObject();
				var linkLayersPredicate2 = NSPredicate.predicateWithFormat("userInfo != nil && function(userInfo, 'valueForKeyPath:', %@).selection2 == '" + Selection[1] + "'", selectionDom2);
				destArtboard = context.document.currentPage().children().filteredArrayUsingPredicate(linkLayersPredicate2).firstObject();
			} else {
				return context.document.showMessage(i18.m4);
			}
		}
		var artboardID = destArtboard.objectID();
		linkObject = JSON.parse(context.command.valueForKey_onLayer_forPluginIdentifier("artboardMessage", linkLayer2, kPluginDomain));
		webContents
	      .executeJavaScript(`setLinkMessage(${JSON.stringify(linkObject)})`)
	      .catch(console.error);
		
	});


	webContents.on('link', s => {
		var artboardID = destArtboard.objectID();
		NSUserDefaults.standardUserDefaults().setObject_forKey(s.color, lineColorKeyLink);
		NSUserDefaults.standardUserDefaults().setObject_forKey(s.num, lineThicknessLinkKey);
		colorLineLink = s.color;
		lineThicknessLink = s.num;
		context.command.setValue_forKey_onLayer_forPluginIdentifier(JSON.stringify(s), "artboardMessage", linkLayer2, kPluginDomain);
		getLink(context);
		browserWindow.close();
	});

	webContents.on('closeWindow', s => {
		browserWindow.close();
	});

	browserWindow.loadURL(
      String(
        context.plugin.urlForResourceNamed("pages/link/index.html")
      )
    );

}