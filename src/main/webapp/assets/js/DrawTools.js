/**
 * Title: DrawingTools
 * Description: 基于canvas形状画图工具
 * @author JuniorRay
 * @date Oct 12, 2019
 *
 * 调用方式：

 var drawUtil=new DrawTools();
 //初始化，(如果浏览器不支持H5，会初始化失败，返回false)
 drawUtil.init({
        'canvasId':'cvs4',
        // "bgPic":"test.jpg",//有则设置背景,无则忽略
        // "paintConfig":{//初始化也可以传入样式
        //     lineWidth:2,//线条宽度，默认1
        //     strokeStyle:'blue',//画笔颜色，默认红色
        //     fillStyle:'red',//填充色
        //     lineJoin:"round",//线条交角样式，默认圆角
        //     lineCap:"round"//线条结束样式，默认圆角
        // }
    });
 //设置样式:
 // drawUtil.setStyle({
    //     lineWidth:2,//线条宽度，默认1
    //     strokeStyle:'blue',//画笔颜色，默认红色
    //     fillStyle:'red',//填充色
    //     lineJoin:"round",//线条交角样式，默认圆角
    //     lineCap:"round"//线条结束样式，默认圆角
    // });
 //加载图片
 drawUtil.setBgPic("test.jpg");

 // 鼠标=cursor，线条=line，三角形=triangle，矩形=rectangle，多边形=polygon，
 // 圆形=circle，箭头=arrows，平行四边形=parallelogram，梯形=trapezoid
 // drawUtil.begin('cursor');//选择画笔

 // drawUtil.begin('line');//选择画笔
 // drawUtil.begin('triangle');//选择画笔
 // drawUtil.begin('rectangle');//选择画笔
 drawUtil.begin('polygon');//选择画笔
 // drawUtil.begin('circle');//选择画笔
 // drawUtil.begin('arrows');//选择画笔
 // drawUtil.begin('parallelogram');//选择画笔
 // drawUtil.begin('trapezoid');//选择画笔

 drawUtil.callback({//框选结束后，底层会自动调用该函数
        end:function(e,r){
            console.log(e);
           alert(e.length) ;

            for(var i in e){
                console.log("x坐标："+e[i].getX()+"y坐标："+e[i].getY());
            }
             if(drawUtil.getDrawMode()=="circle"){
                console.log("radius:"+r);
            }
        }
    });
 //恢复鼠标手型，并停止绘图,返回绘制的坐标
 //  var points=drawUtil.end();
 //清除图形,停止绘制
 //  drawUtil.clear();

 //画网格线
 drawUtil.drawGrid(10,10);

 //关闭网格线
 drawUtil.closeGrid();
 //开启框选canvas放大功能
 drawUtil.openEnlarge();
 //关闭框选canvas放大功能
 drawUtil.closeEnlarge();,
 //恢复原有的框选点位的事件(从放大canvas功能切换成框选图片功能时用)
 drawUtil.recoverEvent();

 //获取当前画笔的模式（三角形，矩形等等,返回英文）
 drawUtil.getDrawMode();

 */
var DrawTools =(function(){
    "use strict";//"use strict" 的目的是指定代码在严格条件下执行。严格模式下你不能使用未声明的变量。

    var isBackPoints=false;//是否已经返回点位
    // 记录被放大的参数方便还原
    var selectRectTemp=null;
    var _boxTemp=null;



    /**记录历史绘图数据**/
    var drawingImageData=null;
    /**判断网格线功能是否打开**/
    var isOpenDrawGrid=false;
    //公共方法,获取节点
    var getDom=function(canvasId){
        return document.getElementById(canvasId);
    };
    var isNull=function(s){return s==undefined||typeof(s)=='undefined'||s==null||s=='null'||s==''||s.length<1};
    var banBrowserDefaultMouseEvents=function(){
        //禁止浏览器默认鼠标事件
        document.oncontextmenu=function(){
            return false
        }

        /**禁用f12等开发者模式**/
        //禁用右键（防止右键查看源代码）
        window.οncοntextmenu=function(){
            return false;
        };
        //禁止任何键盘敲击事件（防止F12和shift+ctrl+i调起开发者工具）
        window.onkeydown = window.onkeyup = window.onkeypress = function () {
            window.event.returnValue = false;
            return false;
        };

        //判断浏览器开发者模式是否打开（console.log隐式调用元素的id）兼容浏览器：Chrome，IE11
        function isDevToolsOpened() {
            var opened = false;
            var element = document.createElement('any');
            element.__defineGetter__('id', function() {
                opened = true;
            });
            console.log(element);
            console.clear && console.clear();
            return opened || false;
        }
        //  轮询判断浏览器窗口是否打开，如果打开则强行关闭
        setInterval(function(){
            var isOpen=isDevToolsOpened();
            if(isOpen){
                window.location.reload();//强制刷新
                alert("已经禁用开发者模式,不允许打开开发者选项，请关闭！")
            }
        })
    };
    /**绘图容器*/
    var canvasObj;
    //获得canvas相对浏览器的偏移量
    var cvsClientRect ;

    /**绘图对象*/
    var context;
    /**绘制的图形列表*/
        // var shapes=new Array();
    var graphicType={'cursor':'cursor','line':'line','triangle':'triangle','rectangle':'rectangle','polygon':'polygon','circle':'circle','arrows':'arrows','parallelogram':'parallelogram','trapezoid':'trapezoid'};
    //背景图片绘制配置
    var bgPictureConfig={
        pic:null,//背景图片地址或路径
        repaint:true,//是否作为永久背景图，每次清除时会进行重绘
    };
    //记录放大前的状态
    var beforeEnlargeData=null;
    //加载并绘制图片(src:图片路径或地址),默认重绘背景图
    var loadPicture=function(src){
        if(isNull(src)){
            return ;
        }
        bgPictureConfig.pic=src;
        if(isNull(bgPictureConfig.repaint)||bgPictureConfig.repaint){
            bgPictureConfig.pic=src;
        }
        var img = new Image();
        img.src =src;
        //画背景图
        function drawImage(){
            if(selectRectTemp==null){//如果放大功能没启用

                context.drawImage(img,0,0,canvasObj.width,canvasObj.height);
                saveDrawingData();
            }else{//放大功能开启后会执行如下


                // 记录被放大的参数方便还原
                context.drawImage(img,0,0,canvasObj.width,canvasObj.height);//加入这行防止下面放大时，出现canvasObj放大出现偏移量
                context.drawImage(canvasObj,selectRectTemp.left-_boxTemp.left,selectRectTemp.top-_boxTemp.top,selectRectTemp.width,selectRectTemp.height,0,0,canvasObj.width,canvasObj.height);

            }
            //如果网格线打开，则加载网格功能
            if(isOpenDrawGrid){
                setTimeout(function(){
                    drawGrid( drawGridConfig.stepX, drawGridConfig.stepY);//画表格
                });
            }
        }
        if(img.complete) {
            drawImage();
        } else {
            img.onload = function() {
                drawImage();

            }
        }

    };


    //重新载入绘制样式
    var resetStyle=function(paintConfigParams){
        if(paintConfigParams==null){
            paintConfigParams={};
        }
        context.strokeStyle=paintConfigParams.strokeStyle||'red',//画笔颜色，默认红色;
            context.lineWidth=paintConfigParams.lineWidth||1,//线条宽度，默认1;
            context.lineJoin=paintConfigParams.lineJoin||"round",//线条交角样式，默认圆角;
            context.lineCap=paintConfigParams.lineCap||"round"//线条结束样式，默认圆角;
        context.fillStyle=paintConfigParams.fillStyle||'red'//填充色;
    };
    //鼠标图形
    var cursors=['crosshair','pointer'];
    /** 切换鼠标样式*/
    var switchCorser=function(b){
        canvasObj.style.cursor=((isNull(b)?isDrawing():b)?cursors[0]:cursors[1]);
    };
    //操作控制变量组
    var ctrlConfig={
        kind:"cursor",//当前绘画分类
        isPainting:false,//是否开始绘制
        startPoint:null,//起始点
        currentGraph:null,//当前绘制的图像
        currentPoint:null,//当前临时坐标点，确定一个坐标点后重新构建
        currentAngle:null,//当前箭头角度
        vertex:[],//坐标点
    };
    //获取当前画笔的模式（三角形，矩形等等）
    var getDrawMode=function(){
        return ctrlConfig.kind;
    };

    /**获取当前坐标点*/
    var getcurrentPoint=function(i){
        return ctrlConfig.currentPoint[i];
    };
    /**设置当前坐标点*/
    var setcurrentPoint=function(p,i){
        return ctrlConfig.currentPoint[i]=p;
    };
    /**设置当前临时坐标点值*/
    var setcurrentPointXY=function(x,y,i){
        if(isNull(ctrlConfig.currentPoint)){
            var arr=new Array();
            arr[i]=new Point(x,y);
            ctrlConfig.currentPoint=arr;
        }else if(isNull(ctrlConfig.currentPoint[i])){
            setcurrentPoint(new Point(x,y),i);
        }else{
            ctrlConfig.currentPoint[i].setXY(x,y);
        }
        return getcurrentPoint(i);
    };
    /**是否正在绘制*/
    var isDrawing=function (){
        return ctrlConfig.isPainting;
    };
    /**开始绘制状态*/
    var beginDrawing=function(){
        ctrlConfig.isPainting=true;
    };
    /**结束绘制状态*/
    var stopDrawing=function(){
        ctrlConfig.isPainting=false;
        var points=null;
        if(ctrlConfig.kind==graphicType.polygon){
            var polygon=getcurrentGraph();
            points=polygon.getPoints();
            for(var i in points){
                // console.log("x坐标："+points[i].getX()+"y坐标："+points[i].getY());
            }
            // alert("已经返回坐标，请看控制台打印信息");
            // console.log("已经绘制的点位数量=="+polygon.getSize())
        }

        // typeof obj.end=="function"? obj.end.call(this,e):"";
        // setInterval(function(){
        //
        // })

        isBackPoints=true;//是否已经返回点位

        return points
    };
    /**是否有开始坐标点*/
    var hasStartPoint=function(){
        return !isNull(ctrlConfig.startPoint);
    };
    /**设置当前绘制的图形*/
    var setcurrentGraph=function(g){
        ctrlConfig.currentGraph=g;
    };
    /**获取当前绘制的图形*/
    var getcurrentGraph=function(){
        return ctrlConfig.currentGraph;
    };
    /**设置开始坐标点（线条的起始点，三角形的顶点，圆形的圆心，四边形的左上角或右下角，多边形的起始点）*/
    var setStartPoint=function(p){
        ctrlConfig.startPoint=p;
    };
    /**获取开始坐标点*/
    var getStartPoint=function(){
        return ctrlConfig.startPoint;
    };
    /**保存canvas面板轨迹信息**/
    function saveDrawingData() {
        drawingImageData = context.getImageData(0, 0, canvasObj.width, canvasObj.height);
        return drawingImageData;
    }
    /**恢复canvas面版轨迹信息**/
    function restoreDrawingData() {
        if(drawingImageData!=null){
            context.putImageData(drawingImageData, 0, 0);

        }else{
            console.error("drawingImageData数据为空")
        }
    }
    /**根据data恢复canvas面版轨迹信息**/
    function restoreDrawingByData(canvasData) {
        if(canvasData!=null){
            context.putImageData(canvasData, 0, 0);

        }else{
            context.putImageData(drawingImageData, 0, 0);
            console.error("canvasData数据为空，自动切换到历史数据")
        }
    }


    var drawGridConfig={//画表格的默认配置
        stepX:10,
        stepY:10,
        color:'#aaa'
    };
    /**清空全部*/
    var clearAll=function(isSaveOldData){

        context.clearRect(0,0,canvasObj.width,canvasObj.height);
        if(isSaveOldData){

        }
        // 保存canvas绘画信息
        saveDrawingData();


    };
    /**重绘*/
    var repaint=function(){
        // alert('repaint');
        isBackPoints=false;//是否已经返回点位
        //清空所有canvas
        clearAll();
        //重新加载图片
        if(bgPictureConfig.repaint){
            loadPicture(bgPictureConfig.pic);
        }
    };
    var isBlank=function(t) {
        if(t==null||t=="undefined"||t==undefined||t==""||t=='NaN' || t == "null"){
            return true;
        }else{
            if((t+'').trim()==""){
                return true;
            }
            //空对象 isOwnEmpty(obj)
            let isEmptyObject=function(t){

                for(var key in t){
                    return false
                }
                return true
            };
            try {

                if(typeof(t)=="object"){
                    return  isEmptyObject(t);
                }
            }catch (e) {
                return false;
            }
            return false;
        }
    };



    /**点（坐标,绘图的基本要素,包含x,y坐标）*/
    var Point=(function(x1,y1){
        var x=x1,y=y1;
        return{
            set:function(p){
                x=p.x,y=p.y;
            },
            setXY:function(x2,y2){
                x=x2;y=y2;
            },
            setX:function(x3){
                x=x3;
            },
            setY:function(y3){
                y=y3;
            },
            getX:function(){
                return x;
            },
            getY:function(){
                return y;
            }
        }
    });
    /**多角形（三角形、矩形、多边形），由多个点组成*/
    var Poly=(function(pointsParam){

        var points=isNull(pointsParam)?new Array():pointsParam;
        var size=points.length;
        // console.log(size);
        return{
            set:function(pointsPara){
                points=pointsPara;
            },
            getSize:function(){
                return size;
            },
            setPoint:function(p,i){
                if(isNull(p)&&isNaN(i)){
                    return;
                }
                points[i]=p;
            },
            setStart:function(p1){
                if(isNull(points)){
                    points=new Array();
                    var tempSize= points.push(p1);
                    size=tempSize;
                    return tempSize;
                }else{
                    points[0]=p1;
                }
            },
            add:function(p){
                if(isNull(points)){
                    points=new Array();
                }
                var tempSize=points.push(p);
                size=tempSize;
                return tempSize;

            },
            pop:function(){//删除最后一个元素
                if(isNull(points)){
                    return;
                }
                var lastVal=points.pop();
                size=points.length;
                return lastVal;
            },
            shift:function(){//方法用于把数组的第一个元素从其中删除，并返回第一个元素的值。
                if(isNull(points)){
                    return;
                }
                var  firstVal=points.shift();
                size=points.length;
                return firstVal;
            },
            getPoints:function(){
                if(isNull(points)){
                    return null;
                }
                //过滤左键和右键同时点击产生的重复点位
                for(var i in points){
                    if(i!=-1){//过滤掉-1时存储的临时点位
                        var x=points[i].getX();
                        var y=points[i].getY();
                        if(i>0){//最后一点，如果左键点了，右键也点了同一个点，则进行去重处理,删除最后一个重复的点位
                            var beforeX=points[i-1].getX();
                            var beforeY=points[i-1].getY();
                            if((beforeX==x)&&(beforeY==y)){
                                points.pop();//删除并return数组的最后一个元素(重复点位)。
                                size=points.length;

                                console.log("删除的重复点位为："+i+":"+x+"======"+y);
                                console.log("points-size=="+points.length)

                            }

                        }

                    }
                }

                return points;
            },
            draw:function(){
                context.beginPath();
                // console.log(size)
                // debugger
                for(var i in points){//i从0，开始到points.length进行循环
                    // console.log("i====");
                    // console.log("i===="+i);
                    if(i==0){
                        context.moveTo(points[i].getX(),points[i].getY());
                    }else{
                        context.lineTo(points[i].getX(),points[i].getY());

                        // console.log(points[i].getX()+":::"+points[i].getY());
                    }

                }
                context.closePath();
                context.stroke();

                // drawPolygon(points);
            }
        }
    });
    /*线条(由两个点组成，包含方向)*/
    var Line=(function(p1,p2,al){
        var start=p1,end=p2,angle=al;
        var drawLine=function(){
            context.beginPath();
            context.moveTo(p1.getX(),p1.getY());
            context.lineTo(p2.getX(),p2.getY());
            context.stroke();
        };
        //画箭头
        var drawArrow=function() {
            var vertex =ctrlConfig.vertex;
            var x1=p1.getX(),y1=p1.getY(),x2=p2.getX(),y2=p2.getY();
            var el=50,al=15;
            //计算箭头底边两个点（开始点，结束点，两边角度，箭头角度）
            vertex[0] = x1,vertex[1] = y1, vertex[6] = x2,vertex[7] = y2;
            //计算起点坐标与X轴之间的夹角角度值
            var angle = Math.atan2(y2 - y1, x2 - x1) / Math.PI * 180;
            var x = x2 - x1,y = y2 - y1,length = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
            if (length < 250) {
                el/=2,al/2;
            }else if(length<500){
                el*=length/500,al*=length/500;
            }
            vertex[8] = x2 - el * Math.cos(Math.PI / 180 * (angle + al));
            vertex[9] = y2- el * Math.sin(Math.PI / 180 * (angle + al));
            vertex[4] = x2- el* Math.cos(Math.PI / 180 * (angle - al));
            vertex[5] = y2 - el * Math.sin(Math.PI / 180 * (angle - al));
            //获取另外两个顶点坐标
            x=(vertex[4]+vertex[8])/2,y=(vertex[5]+vertex[9])/2;
            vertex[2] = (vertex[4] + x) / 2;
            vertex[3] = (vertex[5] + y) / 2;
            vertex[10] = (vertex[8] +x) / 2;
            vertex[11] = (vertex[9] +y) / 2;
            //计算完成,开始绘制
            context.beginPath();
            context.moveTo(vertex[0], vertex[1]);
            context.lineTo(vertex[2], vertex[3]);
            context.lineTo(vertex[4], vertex[5]);
            context.lineTo(vertex[6], vertex[7]);
            context.lineTo(vertex[8], vertex[9]);
            context.lineTo(vertex[10], vertex[11]);
            context.closePath();
            context.fill();
            context.stroke();
        };
        return{
            setStart:function(s){
                start=s;
            },
            setEnd:function(e){
                end=e;
            },
            getStart:function(){
                return start;
            },
            getEnd:function(){
                return end;
            },
            draw:function(){
                if(angle){
                    drawArrow();
                }else{
                    drawLine();
                }
            }
        }
    });
    /**圆形(包含圆心点和半径)*/
    var Circle=(function(arr){
        //包含起始点（圆心）和结束点,以及圆半径
        var startPoint=arr.start,endPoint=arr.end,radius=arr.radius;
        /*绘制圆*/
        var drawCircle=function(){
            context.beginPath();
            var x=startPoint.getX();
            var y=startPoint.getY();
            if(isNull(radius)){
                radius=calculateRadius(startPoint,endPoint);
            }
            //x,y,半径,开始点,结束点,顺时针/逆时针
            context.arc(x,y,radius,0,Math.PI*2,false); // 绘制圆
            context.stroke();
        };
        //计算圆半径
        var calculateRadius=function(p1,p2){

            // console.log("p1"+"==="+"p2");
            // console.log(p1);
            // console.log(p2);

            var width=p2.getX()-p1.getX();
            var height=p2.getY()-p1.getY();
            //如果是负数
            if(width<0||height<0){
                width=Math.abs(width);
            }
            //计算两点距离=平方根(width^2+height^2)
            let c=Math.sqrt(Math.pow(width,2)+Math.pow(height,2));
            return c;
        };
        var p=startPoint;
        return{
            set:function(params){
                startPoint=params.start;
                endPoint=params.end;
                radius=params.radius;
            },
            setPoint:function(p1){
                p=p1;
            },
            getPoint:function(){
                return p;
            },
            setRadius:function(r1){
                radius=r1;
            },
            getRadius:function(){
                return radius;
            },
            calcRadius:calculateRadius,
            //绘制
            draw:drawCircle,
            getPoints:function(){//兼容其他类
                if(isNull(p)){
                    return null;
                }
                let arr=[];
                arr.push(p);
                return arr;
            },
        }
    });
    /**绘制线条工具方法*/
    var drawLine=function(p){
        context.beginPath();
        context.moveTo(startPosition.getX(),startPosition.getY());
        context.lineTo(p.getX(),p.getY());
        context.stroke();
    };
    /**绘制三角形工具方法*/
    var drawTriangle=function(points){
        context.beginPath();
        var a=points.get();
        context.moveTo(a[0].getX(),a[0].getY());
        context.lineTo(a[1].getX(),a[1].getY());
        context.lineTo(a[2].getX(),a[2].getY());
        context.closePath();
        context.stroke();
    };
    /**绘制矩形工具方法*/
    var drawRectangle=function(p2){
        var p=getStartPoint();
        var width=p.getX()-p2.getX();
        var height=p.getY()-p2.getY();
        context.beginPath();
        context.strokeRect(x,y,width,height);//绘制矩形
    };
    /*绘制多边形工具方法*/
    var drawPolygon=function(points){
        if(points.length>1){//保证只有两个坐标点才是矩形
            context.beginPath();
            var p=ctrlConfig.startPoint;
            // console.log(p);
            var x=p.getX();
            var y=p.getY();
            context.moveTo(x,y);
            for(var i in points){
                context.lineTo(points[i].getX(),points[i].getY());
            }
            context.stroke();
        }
    };
    /*绘制圆角矩形工具方法*/
    var drawRoundedRect=function(x,y,width,height,radius){
        context.beginPath();
        context.moveTo(x,y+radius);
        context.lineTo(x,y+height-radius);
        context.quadraticCurveTo(x,y+height,x+radius,y+height);
        context.lineTo(x+width-radius,y+height);
        context.quadraticCurveTo(x+width,y+height,x+width,y+height-radius);
        context.lineTo(x+width,y+radius);
        context.quadraticCurveTo(x+width,y,x+width-radius,y);
        context.lineTo(x+radius,y);
        context.quadraticCurveTo(x,y,x,y+radius);
        context.stroke();
    };
    /*绘制圆工具方法*/
    var drawCircle=function(c){
        var p=c.getPoint();//坐标点
        var x=p.getX();
        var y=p.getY();
        var r=c.getRadius();
        context.beginPath();
        //x,y,半径,开始点,结束点,顺时针/逆时针
        context.arc(x,y,r,0,Math.PI*2,false); // 绘制圆
        context.stroke();
    };
    //计算圆半径工具方法
    var calculateRadius=function(p1,p2){
        var width=p2.getX()-p1.getX();
        var height=p2.getY()-p1.getY();
        //如果是负数
        if(width<0||height<0){
            width=Math.abs(width);
        }
        //计算两点距离=平方根(width^2+height^2)
        var c=Math.sqrt(Math.pow(width,2)+Math.pow(height,2));
        return c;
    };
    //鼠标按键点击（首次点击确定开始坐标点，拖动鼠标不断进行图形重绘）
    var mouseDown = function(e){
        // /**恢复canvas面版轨迹信息**/
        // restoreDrawingData();
        if(ctrlConfig.kind!=graphicType.polygon){//多边形目前如果保存上一次记录会出现三角形重影bug
            // 保存canvas绘画信息
            saveDrawingData();
        }

        // debugger
        // alert("111");

        var btnNum = e.button;
        if(btnNum==0){
            // console.log("选择："+ctrlConfig.kind);
            //全局记录点位信息
            /*
                        points.push({//顶点
                            x: e.pageX - cvsClientRect.x,
                            y: e.pageY - cvsClientRect.y
                        });*/
            // console.log(points);
            //如果是多边形,返回顶点.如果圆则返回圆心坐标,和半径
            /*   for (var i = 0; i < points.length; i++) {
                   var point = points[i];
                   point.x = parseInt(point.x);
                   point.y = parseInt(point.y);

                   // console.log( point.x+"==="+ point.y);
                   // if(btnNum==2){
                   //     point.push((points[points.length-1]).x+"==="+(points[points.length-1]).y);
                   //     console.log(point);
                   //     console.log( point.x+"==="+ point.y);
                   // }else{
                   //     console.log( point);
                   // }
               }
               console.log(point); // 先左键 再右键结束*/
            //设置起始点
            switch(ctrlConfig.kind){

                case graphicType.polygon://多边形
                    // repaint();
                    var p=new Point(e.offsetX,e.offsetY);
                    if(isDrawing()){
                        getcurrentGraph().add(p);//添加到
                    }else{//第一次进来执行，确定开始坐标
                        beginDrawing();//开始绘制
                        setStartPoint(p);
                        var poly=new Poly();
                        poly.add(p);
                        // console.log(poly);
                        setcurrentGraph(poly);//设置当前绘制图形
                    }
                    break;


                case graphicType.line://线条
                    beginDrawing();//开始绘制
                    var p=new Point(e.offsetX,e.offsetY);
                    setStartPoint(p);
                    var poly=new Poly();
                    poly.add(p);
                    setcurrentGraph(poly);//设置当前绘制图形
                    break;
                case graphicType.arrows://方向
                    beginDrawing();//开始绘制
                    var p=new Point(e.offsetX,e.offsetY);
                    setStartPoint(p);
                    var poly=new Poly();
                    poly.add(p);
                    setcurrentGraph(poly);//设置当前绘制图形
                    break;
                case graphicType.triangle://三角形
                    beginDrawing();//开始绘制
                    var p=new Point(e.offsetX,e.offsetY);
                    setStartPoint(p);
                    var poly=new Poly();
                    poly.add(p);
                    setcurrentGraph(poly);//设置当前绘制图形
                    break;
                case graphicType.rectangle://矩形
                    beginDrawing();//开始绘制
                    var p=new Point(e.offsetX,e.offsetY);
                    setStartPoint(p);
                    var poly=new Poly();
                    poly.add(p);
                    setcurrentGraph(poly);//设置当前绘制图形
                    break;
                case graphicType.parallelogram://平行四边形
                    beginDrawing();//开始绘制
                    var p=new Point(e.offsetX,e.offsetY);
                    setStartPoint(p);
                    var poly=new Poly();
                    poly.add(p);
                    setcurrentGraph(poly);//设置当前绘制图形
                    break;


                case graphicType.trapezoid://梯形
                    beginDrawing();//开始绘制
                    var p=new Point(e.offsetX,e.offsetY);
                    setStartPoint(p);
                    var poly=new Poly();
                    poly.add(p);
                    setcurrentGraph(poly);//设置当前绘制图形
                    break;
                case graphicType.circle://圆
                    console.log("确定图形绘制开始坐标点："+e.offsetX+","+e.offsetY);//点击确定图形的开始坐标点
                    beginDrawing();//开始绘制
                    var p=new Point(e.offsetX,e.offsetY);
                    setStartPoint(p);
                    var circle= new Circle({'start':p});
                    setcurrentGraph(circle);
                    break;
                case graphicType.cursor: //手型鼠标
                    switchCorser(false);//切换鼠标样式
                    break;

                default://默认是手型鼠标，不允许绘制
                    break;
            }
        }else if(btnNum==2){
            // console.log("右键由于结束多边形绘制");
            /*           points.push({//结束点
                           x: e.pageX - cvsClientRect.x,
                           y: e.pageY - cvsClientRect.y
                       });
                       console.log(points);// 直接右键结束时 所有顶点的坐标*/
            // console.log((points[points.length-1]).x+"==="+(points[points.length-1]).y);// 右键结束点的坐标



            if(isDrawing()){
                if(ctrlConfig.kind==graphicType.polygon){//多边形选择时右键结束
                    var p=new Point(e.offsetX,e.offsetY);
                    getcurrentGraph().add(p);//添加到
                    // repaint();// 重绘
                    // 保存canvas绘画信息
                    saveDrawingData();
                    getcurrentGraph().draw();// 开始绘制图形
                    var points= stopDrawing();//结束绘制

                }
            }


            //如果是多边形,返回顶点.如果圆则返回圆心坐标,和半径
            /*   for (var i = 0; i < points.length; i++) {
                   // var point = points[i];
                   // point.x = parseInt(point.x);
                   // point.y = parseInt(point.y);
                   // console.log( point.x+"==="+ point.y);
                   // if(btnNum==2){
                   //     point.push((points[points.length-1]).x+"==="+(points[points.length-1]).y);
                   //     console.log(point);
                   //     console.log( point.x+"==="+ point.y);
                   // }else{
                   //     console.log( point);
                   // }
               }*/





        }


        // banBrowserDefaultMouseEvents();//屏蔽浏览器默认事件
    };

    //鼠标移动（拖动，根据鼠标移动的位置不断重绘图形）
    var mouseMove = function(e){

        if(isDrawing()&&hasStartPoint()){//检查是否开始绘制，检查是否有开始坐标点

            /**恢复canvas面版轨迹信息**/
            restoreDrawingData();
            //画笔不需要重绘
            if(ctrlConfig.kind!="cursor"){
                // repaint();//重绘,此处用防止绘画拖动时出现上一次的残影

            }

            //移动时的临时末尾点
            var p=setcurrentPointXY(e.offsetX,e.offsetY,0);//设置共享的临时坐标点，用于防止重复创建对象


            switch(ctrlConfig.kind){

                case graphicType.polygon://多边形
                    var poly=getcurrentGraph();
                    // var size=poly.getSize();
                    // console.log("size=="+size);
                    // poly.setPoint(p,(size-1));
                    poly.setPoint(p,-1);//-1是临时点位
                    // poly.setPoint(p,0);
                    // console.log(poly);
                    poly.draw();

                    break;
                case graphicType.line://线条
                    var line=new Line(getStartPoint(),p,false);
                    ctrlConfig.currentGraph=line;
                    line.draw();
                    break;
                case graphicType.arrows://方向
                    var line=new Line(getStartPoint(),p,true);
                    ctrlConfig.currentGraph=line;
                    line.draw();
                    break;
                case graphicType.triangle://三角形
                    var lu=getStartPoint();
                    var x2=p.getX();
                    var x1=lu.getX();
                    //三角形左边的点坐标计算方法:(x1-(x2-x1),y2)
                    var x3=x1-(x2-x1);
                    var l=setcurrentPointXY(x3,p.getY(),1);//设置共享的临时坐标点，用于防止重复创建对象
                    var poly=getcurrentGraph();//获取当前图形
                    poly.set([lu,p,l]);
                    poly.draw();//即时绘制
                    break;
                case graphicType.parallelogram://平行四边形
                    var lu=getStartPoint();
                    var x3=p.getX();
                    var x1=lu.getX();
                    //平行四边形两个未知坐标点计算方法:(x1-(x3-x1),y3),(x1+(x3-x1),y1)
                    var x2=x3+(x3-x1);
                    var x4=x1-(x3-x1);
                    var ld=setcurrentPointXY(x2,lu.getY(),1);//设置共享的临时坐标点，用于防止重复创建对象
                    var ru=setcurrentPointXY(x4,p.getY(),2);//设置共享的临时坐标点，用于防止重复创建对象
                    var poly=getcurrentGraph();//获取当前图形
                    poly.set([lu,ru,p,ld]);
                    poly.draw();//即时绘制
                    break;
                case graphicType.trapezoid://梯形
                    var lu=getStartPoint();
                    var x3=p.getX();
                    var x1=lu.getX();
                    //梯形两个未知坐标点计算方法:(x3-(x3-x1)/2,y1),(x1-(x3-x1)/2,y3)
                    var x2=x3-(x3-x1)/2;
                    var x4=x1-(x3-x1)/2;
                    var ld=setcurrentPointXY(x2,lu.getY(),1);
                    var ru=setcurrentPointXY(x4,p.getY(),2);
                    var poly=getcurrentGraph();
                    poly.set([lu,ru,p,ld]);
                    poly.draw();
                    break;
                case graphicType.rectangle://矩形
                    var lu=getStartPoint();
                    //矩形右上角和左上角坐标计算方法
                    var ld=setcurrentPointXY(lu.getX(),p.getY(),1);
                    var ru=setcurrentPointXY(p.getX(),lu.getY(),2);
                    var poly=getcurrentGraph();
                    poly.set([lu,ru,p,ld]);
                    poly.draw();
                    break;
                case graphicType.circle://圆
                    var circle=getcurrentGraph();//获取当前图形
                    circle.set({'start':getStartPoint(),'end':p});
                    circle.draw();//即时绘制
                    break;
                case graphicType.cursor: //手型鼠标
                    switchCorser(false);//切换鼠标样式
                    break;

                default://默认是手型鼠标，不允许绘制
            }
        }
    };
    //鼠标按键松开
    var mouseUp = function(e){

        // alert("鼠标按键松开");
        if(isDrawing()){
            //加这一行的目的在于画笔切换成多边形时，防止丢掉上一个非多边形图形
            if(ctrlConfig.kind!=graphicType.polygon){//多边形目前如果保存上一次记录会出现三角形重影bug
                // 保存canvas绘画信息
                saveDrawingData();
            }
            /**恢复canvas面版轨迹信息**/
            restoreDrawingData() ;
            //console.log("松开鼠标按键:"+e.offsetX+","+e.offsetY);
            //画笔不需要重绘
            if(ctrlConfig.kind!="cursor"){
                // repaint();
                getcurrentGraph().draw();
            }
            if(ctrlConfig.kind!=graphicType.polygon){//多边形绘制鼠标按键松开不结束绘制，多边形只有右键点击才能结束绘制
                var points=stopDrawing();//结束绘制
            }
            //保存canvas绘画信息
            // saveDrawingData();
        }
    };
    //鼠标移出
    var mouseOut = function(e){

        // console.log("鼠标移出绘制区域"+e.offsetX+","+e.offsetY);
        if(isDrawing()){
            /**恢复canvas面版轨迹信息**/
            restoreDrawingData() ;
            // console.log("停止绘制");
            if(ctrlConfig.kind!="cursor"){
                // repaint();
                getcurrentGraph().draw();
            }
            var points= stopDrawing();//停止绘制
            //保存canvas绘画信息
            saveDrawingData();
        }
    };

    //canvas画网格
    function drawGrid(stepX , stepY){//绘制网格
        //保存canvas绘画信息
        saveDrawingData();
        /**
         * save：用来保存Canvas的状态。save之后，可以调用Canvas的平移、放缩、旋转、错切、裁剪等操作。
         * restore：用来恢复Canvas之前保存的状态。防止save后对Canvas执行的操作对后续的绘制有影响。

         对canvas中特定元素的旋转平移等操作实际上是对整个画布进行了操作，所以如果不对canvas进行save以及restore，
         那么每一次绘图都会在上一次的基础上进行操作，最后导致错位。
         比如说你相对于起始点每次30度递增旋转，30，60，90.
         如果不使用save 以及 restore 就会变成30, 90, 150，
         每一次在前一次基础上进行了旋转。save是入栈，restore是出栈。
         save()就是把当前状态压入栈中(Push)，restore()相当于弹出栈顶状态(Pop)


         * **/
        // debugger
        // var context=context;
        context.save();
        context.strokeStyle = drawGridConfig.color;
        context.lineWidth = 0.5 ;
        for(var i = stepX + 0.5 ; i < context.canvas.width ; i += stepX){
            context.beginPath();
            context.moveTo(i , 0);
            context.lineTo(i , context.canvas.height);
            context.stroke();
        }
        for(var i = stepY + 0.5 ; i < context.canvas.height ; i += stepY){
            context.beginPath();
            context.moveTo(0 , i);
            context.lineTo(context.canvas.width , i);
            context.stroke();
        }
        context.restore();

    }
    //canvas 关闭表格
    function closeGrid(){
        isOpenDrawGrid=false;//是否打开表格flag进行复位
        // //清除canvas所有
        // clearAll();
        // //重载原图
        // loadPicture(bgPictureConfig.pic);
        restoreDrawingData();

    }

    /***======canvas鼠标滚轮滚动放大放小========**/
    //
    // let stemp = 10 ;// 步进
    // let shrinkNum=10;//缩放等级步进
    // // 计算尺寸的函数
    // let roll = function (e) {
    //     e = e || window.event;
    //     if (e.wheelDelta) {  //判断浏览器IE，谷歌滑轮事件
    //         if (e.wheelDelta > 0) { //当滑轮向上滚动时
    //             stemp=stemp-shrinkNum;
    //             return e.wheelDelta / 120 + stemp;
    //         }
    //         if (e.wheelDelta < 0) { //当滑轮向下滚动时
    //             stemp=stemp+shrinkNum;
    //             return e.wheelDelta / 120 + stemp;
    //         }
    //     } else if (e.detail) {  //Firefox滑轮事件
    //         if (e.detail> 0) { //当滑轮向上滚动时
    //             stemp=stemp-shrinkNum;
    //             return e.wheelDelta / 120 + stemp;
    //         }
    //         if (e.detail< 0) { //当滑轮向下滚动时
    //             stemp=stemp+shrinkNum;
    //             return e.wheelDelta / 120 + stemp;
    //         }
    //     }
    // };
    // //给页面绑定滑轮滚动事件
    // if (document.addEventListener) {
    //     document.addEventListener('DOMMouseScroll', roll, false)
    // }
    // // 控制写入图片大小的函数(和鼠标滚轮缩放功能有关)
    // function drawImageScale (resize,img) {
    //     if (!resize) {
    //         resize = 10;
    //     }
    //     let imgWidth = canvasObj.width + resize;
    //     let imgHeight = canvasObj.height + resize;
    //     // let sx = imgWidth / 2 - canvas.width / 2
    //     // let sy = imgHeight / 2 - canvas.height / 2
    //     let dx =  canvasObj.width / 2 - imgWidth / 2;
    //     let dy = canvasObj.height / 2 - imgHeight / 2;
    //     context.drawImage(img, dx, dy, imgWidth, imgHeight, 0, 0, canvasObj.width, canvasObj.height);
    // }
    /***======canvas鼠标滚轮滚动放大放小功能结束======**/


    /**
     * 恢复原有canvas事件
     * 恢复原有的框选点位的事件
     * (从放大canvas功能切换成框选图片功能时用)
     **/
    function recoverEvent(){
        //恢复原有的框选点位的事件
        canvasObj.onmousedown = mouseDown;
        canvasObj.onmouseup = mouseUp;
        canvasObj.onmousemove = mouseMove;
        canvasObj.onmouseout = mouseOut;
    }

    /***开启框选放大canvas 功能**/
    function openEnlarge(){
        //记录放大前的状态
        enlarge();

    }
    /***关闭框选放大canvas 功能**/
    function closeEnlarge(){

        //放大相关的临时变量置空
        selectRectTemp=null;
        _boxTemp=null;
        //恢复原有的框选点位的事件
        recoverEvent();
        //恢复放大前历史canvas轨迹；
        restoreDrawingByData(beforeEnlargeData);
    }


    //框选放大canvas
    function  enlarge(){
        var	width = canvasObj.width;
        var	height = canvasObj.height;
        var	selectRect = {};
        var	dragging = false;
        var msdown = {};

        var selector=document.createElement("div");
        selector.style.position='fixed';
        selector.style.border='3px solid blue';
        selector.style.cursor='crosshair';
        selector.style.display='none';


        //在该元素后面追加节点
        function insertAfter(newElement, targetElement) {
            var parent = targetElement.parentNode;
            if (parent.lastChild == targetElement) {
                // 如果最后的节点是目标元素，则直接添加。因为默认是最后
                parent.appendChild(newElement);
            } else {
                parent.insertBefore(newElement, targetElement.nextSibling);
                //如果不是，则插入在目标元素的下一个兄弟节点 的前面。也就是目标元素的后面
            }
        }
        insertAfter(selector,canvasObj);




        var selectorObj = {
            //选取开始
            selectStart : function(x,y) {
                msdown.x = x;//鼠标按下横坐标
                msdown.y = y;
                selectRect.left = msdown.x;
                selectRect.top = msdown.y;//
                this.moveSelector();//移动选取框
                this.showSelector();//显示选取框
                dragging = true;//
            },
            //移动选取框
            moveSelector: function () {
                selector.style.top = selectRect.top + "px";
                selector.style.left = selectRect.left + "px";

            },
            //显示选取框
            showSelector:function(){
                selector.style.display = "inline";
            },
            //展开选取框
            selectorStretch:function(x,y){
                selectRect.left = Math.min(x,msdown.x);
                selectRect.top = Math.min(y,msdown.y);
                selectRect.width = Math.abs(x - msdown.x);
                selectRect.height = Math.abs(y-msdown.y);
                this.moveSelector();//移动选取框
                this.resizeSelector();//重设选取框

            },
            //重设选取框大小
            resizeSelector:function(){
                selector.style.width = selectRect.width + "px";
                selector.style.height = selectRect.height + "px";
            },
            //重置选取框
            resetSelector:function(){
                selectRect = {top:0,left:0,width:0,height:0};
            },
            //选取结束
            selectEnd:function(){
                var _box = canvasObj.getBoundingClientRect();
                try{

                    //记录放大前的状态（saveDrawingData执行后，drawingImageData会更新）
                    //console.log(beforeEnlargeData);
                    beforeEnlargeData=saveDrawingData();
                    console.log(beforeEnlargeData);

                    //赋值给临时变量
                    selectRectTemp=selectRect;
                    _boxTemp=_box;
                    console.log("selectEnd=====")
                    console.log(selectRectTemp);
                    console.log(_boxTemp);
                    console.log(width);
                    console.log(height);
                    context.drawImage(canvasObj,selectRect.left-_box.left,selectRect.top-_box.top,selectRect.width,selectRect.height,0,0,width,height);


                }catch (e){
                }
                this.resetSelector();
                selector.style.width = 0;
                selector.style.height = 0;
                this.hideSelector();
                dragging = false;
            },
            hideSelector:function(){
                selector.style.display = "none";
            }
        };

        canvasObj.onmousedown = function(e){
            var x = e.clientX,y = e.clientY;
            e.preventDefault();//阻止浏览器默认事件
            selectorObj.selectStart.call(selectorObj,x,y);
        };
        canvasObj.onmousemove  = function(e){
            var x = e.clientX,y = e.clientY;
            e.preventDefault();
            if(dragging){
                selectorObj.selectorStretch.call(selectorObj,x,y);
            }
        };
        canvasObj.onmouseup = function(e){
            e.preventDefault();
            selectorObj.selectEnd.call(selectorObj);
        };
    }



    /***开启框选放大canvas 功能结束**/

    return{
        // isNull:isNull,
        // getDom:getDom,//对外接口,获取canvas对象
        clear:function(){//清除图形,停止绘制
            var points= stopDrawing();//停止绘制
            clearAll();
            loadPicture(bgPictureConfig.pic);

            // repaint();
        },
        banBrowserDefaultMouseEvents:function(params){
            if(params==true){
                banBrowserDefaultMouseEvents();//屏蔽浏览器默认事件
            }
        },
        /**初始化*/
        init:function(params){
            if(params.banBrowserDefaultMouseEvents==true){
                banBrowserDefaultMouseEvents();//屏蔽浏览器默认事件
            }

            canvasObj=getDom(params.canvasId);

            // canvasObj.onmousewheel = canvasObj.onmousewheel = roll ;// 给canvas绑定滑轮滚动事件

            //获得canvas相对浏览器的偏移量
            cvsClientRect = canvasObj.getBoundingClientRect();
            //浏览器是否支持Canvas
            if (canvasObj.getContext){
                /**绘图对象*/
                context=canvasObj.getContext("2d");



                canvasObj.onmousedown = mouseDown;
                canvasObj.onmouseup = mouseUp;
                canvasObj.onmousemove = mouseMove;
                canvasObj.onmouseout = mouseOut;
                if(!isNull(params.paintConfig)){

                    resetStyle(params.paintConfig);//载入样式
                }else{
                    resetStyle();//载入默认样式
                }




                var bgPic=params.bgPic;
                if(!isNull(bgPic)){
                    loadPicture(bgPic);//设置背景图片（异步加载图片）
                }
                context.fillStyle = 'rgba(255, 255, 255, 0)';

                return true;
            }else{
                console.error("你的浏览器不支持canvas");
                return false;
            }



        },
        //设置样式,对外接口
        setStyle:function(params){
            resetStyle(params);//载入样式
        },
        /**设置背景图片*/
        setBgPic:loadPicture,
        /**选择图形类型*/
        begin:function(k,obj){
            // console.log("选择绘制图形："+k);


            if(isBlank(k)){//如果如果为空,则默认为鼠标样式
                ctrlConfig.kind="cursor";
            }else{
                ctrlConfig.kind=k;
            }
            if(k=='cursor'){
                switchCorser(false);//切换鼠标样式

                // canvasObj.style.cursor=cursors[1];
            }else{
                switchCorser(true);//切换鼠标样式

            }


        },
        //获取画笔当前的模式(矩形，三角形等)
        getDrawMode:getDrawMode,
        /*恢复鼠标手型，并停止绘图*/
        end:function(){
            ctrlConfig.kind="cursor";
            var points= stopDrawing();//停止绘制
            switchCorser(false);//切换鼠标样式
            return points;
        },
        //  该回调函数会实时获取，点位信息，结束点位选择后会调用改回调
        callback:function(obj){
            var timer=setInterval(function(){
                if(isBackPoints!=false){//判断运行鼠标结束后，直接返回点位信息

                    var  points=getcurrentGraph().getPoints();
                    if(getDrawMode()=="circle"){
                        let radius= getcurrentGraph().getRadius();
                        obj.end(points,radius);
                    }else{
                        obj.end(points);
                    }

                    isBackPoints=false;//是否返回点位的标志为复位
                    // clearInterval(timer);
                }

            })
        },
        //canvas画出网格
        drawGrid:function(stepX,stepY){
            //如果该函数被调用说明网格功能开启
            isOpenDrawGrid=true;
            if((stepX!=null)&&(stepY!=null)){
                drawGridConfig.stepX=stepX;
                drawGridConfig.stepY=stepY;
            }
            //执行画表格
            drawGrid( drawGridConfig.stepX,drawGridConfig.stepY);

        },
        //关闭网格线
        closeGrid:closeGrid,
        //开启框选canvas放大功能
        openEnlarge:openEnlarge,
        //关闭框选canvas放大功能
        closeEnlarge:closeEnlarge,
        //恢复原有的框选点位的事件(从放大canvas功能切换成框选图片功能时用)
        recoverEvent:recoverEvent


    }
});