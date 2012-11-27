define(function (require, exports, module) {
	var treeProterty = require('/conf/treeProperty');
	var messageCenter = null;
	var zTree = require('ztree');
	var remote = require('Wiz/remote');
	var context = require('Wiz/context');

	var locale= require('locale');
	var specialLocation = locale.DefaultCategory;

	function ZtreeController() {
		
		var treeObj = null;
		// 'use strict';
		var setting = {
			view : {
				showLine : false,
				selectedMulti : false,
				showIcon: false,
				showIcon: showIconForTree,
				addDiyDom: addDiyDom
			},
			data : {
				simpleData : {
					enable : false
				}

			},
			callback : {
				onClick : zTreeOnClick,
				onExpand: zTreeOnExpand,
				onRightClick: zTreeOnRightClick
			}

		},
			zNodesObj = treeProterty;


		function addDiyDom(treeId, treeNode) {
			var spaceWidth = 10;
			var switchObj = $("#" + treeNode.tId + "_switch"),
			icoObj = $("#" + treeNode.tId + "_ico");
			icoObj.before(switchObj);

			if (treeNode.level > 1) {
				var spaceStr = "<span style='display: inline-block;width:" + (spaceWidth * treeNode.level)+ "px'></span>";
				switchObj.before(spaceStr);
			}
		}

		function showIconForTree(treeId, treeNode) {
			return treeNode.level !== 0;
		};


		function zTreeOnRightClick(event, treeId, treeNode) {
			event.preventDefault();
			event.returnValue = false;
			console.log(event);
		}


		// 节点正在加载中
		function loadingNode(treeNode) {
			var switchIconId = treeNode.tId + '_switch';
			$('#' + switchIconId).addClass('ico_loading');
		}
		// 节点加载完成
		function loadedNode(treeNode) {
			var switchIconId = treeNode.tId + '_switch';
			$('#' + switchIconId).removeClass('ico_loading');
		}

		function zTreeOnExpand(event, treeId, treeNode) {
			//bLoading参数为了防止多次加载同一数据
 			if (treeNode.bLoading) {
 				return;
 			}
 			loadingNode(treeNode);
			//获取到当前的kb_guid
			var kbGuid = treeNode.kb_guid ? treeNode.kb_guid : context.userInfo.kb_guid;
			if ('category' === treeNode.type) {
				remote.getChildCategory(kbGuid, treeNode.location, function (data){ 
					addChildToNode(data.list, treeNode);
				});
			} else if ('tag' === treeNode.type) {
				//获取父标签的GUID，如果没有，则设为''
				var parentTagGuid = treeNode.tag_group_guid ? treeNode.tag_group_guid : '';
				remote.getChildTag(kbGuid, parentTagGuid, function (data) {
					addChildToNode(data.list, treeNode);
				});

			} else if ('group' === treeNode.type) {
				remote.getGroupKbList(function (data) {
					addChildToNode(data.list, treeNode);
				});
			}
		}

		/**
		 * 根据返回的列表，显示相应的树节点
		 * @param {Array} respList 服务端返回的列表
		 * @param {object} treeNode 当前的节点
		 */
		function addChildToNode(respList, treeNode) {
			loadedNode(treeNode);
			if (!respList) {
				return;
			}
			$.each(respList, function (key, child){
				if (child.kb_name) {
					child.name = child.kb_name;
					child.isParent = true;
				} else {
					child.name = child.tag_name ? child.tag_name : child.category_name;
				}
				child.type = treeNode.childType ? treeNode.childType: treeNode.type;
				if (!child.kb_guid) {
					child.kb_guid = treeNode.kb_guid;
				}

				//目录需要经过国际化处理
				if ('category' === treeNode.type && specialLocation[child.name]) {
					child.name = changeSpecilaLocation(child.name);
				}
			});

			console.log(treeObj);
			treeObj.addNodes(treeNode, respList, true);
			treeNode.bLoading = true;
		} 

		// 点击事件
		function zTreeOnClick(event, treeId, treeNode) {
			if (treeNode.level === 0) {
				if (treeNode.type === 'keyword') {
					messageCenter.requestDocList(getParamsFromTreeNode(treeNode));
				} else {
					treeObj.expandNode(treeNode);
					zTreeOnExpand(event, treeId, treeNode);
				}
			} else if (treeNode.level > 0) {
				messageCenter.requestDocList(getParamsFromTreeNode(treeNode));
			}
		}

		/* 从treenode中获取请求的数据		 */
		function getParamsFromTreeNode(treeNode) {
			var params = {};
			params.action_cmd = treeNode.type;
			params.action_value = treeNode.location ? treeNode.location : treeNode.tag_guid;
			params.count = 200;
			console.log(params);
			return params;
		}

		function initTree(id) {
			treeObj =zTree.init($('#' + id), setting, zNodesObj);
			var treeElem = $('#' + id);
			treeElem.hover(function () {
				if (!treeElem.hasClass("showIcon")) {
					treeElem.addClass("showIcon");
				}
			}, function() {
				treeElem.removeClass("showIcon");
			});
			// 树加载完成后，默认选择首项
			setFirstNodeSelectd();
			// $("#leftTree_1_a").offset( {left:10});
			// $("#leftTree_2_a").offset( {left:10});
		}

		function setFirstNodeSelectd() {
			// 选中第一个节点
			var nodes = treeObj.getNodes();
			if (nodes.length>0) {
				$('#' + nodes[0].tId + '_a').trigger('click');
				treeObj.selectNode(nodes[0]);
			}
		}

		/**
		 * 对特殊的文件夹处理，返回相应的显示名
		 */
		function changeSpecilaLocation(location) {
			// 'use strict' ;
			$.each(specialLocation, function (key, value) {
				var index = location.indexOf(key);

				if (index === 0 && location === key) {
					location = value;
					return false;
				}
				if (index === 1 && location.indexOf('/') === 0) {
					location = '/' + value + location.substr(key.length + 1);
					return false;
				}
			});
			return location;
		}

		function init(id, messageHandler) {
			messageCenter = messageHandler;
			initTree(id);
		}

		this.init = init;
	}
	var controller = new ZtreeController();

	exports.init = controller.init;
});