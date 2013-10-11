//packer version
var trace = console ? console.log.bind(console) : function(){};

var LiteGUI = {
	root_container: null,
	panels: {},
	undo_steps: [],
	modalbg_div: null,
	_modules_initialized: false,

	mainmenu: null,
	modules: [],

	init: function(options)
	{
		options = options || {};

		trace("Init lite");
		if(options.width && options.height)
			this.setWindowSize(options.width,options.height);

		this.root_container = $("#work-area")[0];

		this.modalbg_div = document.createElement("div");
		this.modalbg_div.className = "litemodalbg";
		$(document.body).append(this.modalbg_div);

		if(options.menubar)
		{
			this.mainmenu = new LiteGUI.Menubar("mainmenubar");
			$(options.menubar).append(this.mainmenu.root);
		}

		if(options.gui_callback)
			options.gui_callback();

		//init all modules attached to the GUI
		if(options.initModules != false) this.initModules();

		//grab some keys
		$(document).bind("keydown",function(e){
			if(e.target.nodeName.toLowerCase() == "input" || e.target.nodeName.toLowerCase() == "textarea")
				return;
			//trace(e.keyCode);
			if(e.keyCode == 17) return; //ctrl

			if(e.keyCode == 26 || (e.keyCode == 90 && (e.ctrlKey || e.metaKey)) || (e.charCode == 122 && e.ctrlKey) ) //undo
				LiteGUI.doUndo();
			if(e.keyCode == 27) //esc
				$(LiteGUI).trigger("escape");

		});

		if( $("#wrap").hasClass("fullscreen") )
		{
			$(window).resize( function(e) { 
				LiteGUI.maximizeWindow();
			});
		}
	},

	initModules: function()
	{
		//pre init
		for(var i in this.modules)
			if (this.modules[i].init_gui)
				this.modules[i].init_gui();

		//post init
		for(var i in this.modules)
			if (this.modules[i].init && !this.modules[i]._initialized)
			{
				this.modules[i].init();
				this.modules[i]._initialized = true;
			}

		this._modules_initialized = true;
	},

	registerModule: function(module)
	{
		this.modules.push(module);

		//initialize on late registration
		if(this._modules_initialized)
		{
			if (module.init_gui) module.init_gui();
			if (module.init) module.init();
		}

		$(this).trigger("module_registered",module);
	},

	setWindowSize: function(w,h)
	{
		if(w && h)
		{
			$("#wrap").css( {width: w+"px", height: h + "px", "box-shadow":"0 0 4px black"}).removeClass("fullscreen");

		}
		else
		{
			if( $("#wrap").hasClass("fullscreen") )
				return;
			$("#wrap").addClass("fullscreen");
			$("#wrap").css( {width: "100%", height: "100%", "box-shadow":"0 0 0"});
		}
		$(LiteGUI).trigger("resized");
	},

	maximizeWindow: function()
	{
		this.setWindowSize();
	},

	//UNDO **********************
	max_undo_steps: 100,
	min_time_between_undos: 500,
	last_undo_time: 0, //to avoid doing too many undo steps simultaneously

	addUndoStep: function(o)
	{
		var now =  new Date().getTime();
		if( (now - this.last_undo_time) < this.min_time_between_undos) 
			return;
		this.undo_steps.push(o);
		this.last_undo_time = now;
		if(this.undo_steps.length > this.max_undo_steps)
			this.undo_steps.shift();
	},

	doUndo: function()
	{
		//trace("Undo step");
		if(!this.undo_steps.length) return;

		var step = this.undo_steps.pop();
		if(step.callback != null)
			step.callback(step.data);

		$(LiteGUI).trigger("undo", step);
	},

	removeUndoSteps: function()
	{
		this.undo_steps = [];
	},

	// CSS ************************
	addCSS: function(code)
	{
		var style = document.createElement('style');
		style.type = 'text/css';
		style.innerHTML = code;
		document.getElementsByTagName('head')[0].appendChild(style);
	},

	requireCSS: function(url, on_complete)
	{
		if(typeof(url)=="string")
			url = [url];

		while(url.length)
		{
			var link  = document.createElement('link');
			//link.id   = cssId;
			link.rel  = 'stylesheet';
			link.type = 'text/css';
			link.href = url.shift(1);
			link.media = 'all';
			var head = document.getElementsByTagName('head')[0];
			head.appendChild(link);
			if(url.length == 0)
				link.onload = on_complete;
		}
	},

	requireScript: function(url, on_complete)
	{
		if(typeof(url)=="string")
			url = [url];

		function addScript()
		{
			var script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = url.shift(1);
			script.onload = function(e) { 
				if(url.length)
				{
					addScript();
					return;
				}
				
				if(on_complete)
					on_complete();
			};
			document.getElementsByTagName('head')[0].appendChild(script);
		}

		addScript();
	},

	//* DIALOGS *******************
	showModalBackground: function(v)
	{
		if(v)
			$(LiteGUI.modalbg_div).show('fade');
		else
			$(LiteGUI.modalbg_div).hide('fade');
	},

	showMessage: function(content, options)
	{
		options = options || {};
		
		options.title = options.title || "Attention";
		options.content = content;
		options.close = 'fade';
		var dialog = new LiteGUI.Dialog("info_message",options);
		if(!options.noclose)
			dialog.addButton("Close",{ close: true });
		dialog.makeModal('fade');
		return dialog;
	},

	alert: function(content,options)
	{
		options = options || {};

		options.className = "alert";
		options.title = "Alert";
		options.width = 280;
		options.height = 140;
		if (typeof(content) == "string")
			content = "<p>" + content + "</p>";

		return this.showMessage(content,options);
	},

	confirm: function(content,options, callback_yes, callback_no)
	{
		options = options || {};
		if(typeof(options) == "function")
		{
			callback_no = callback_yes;
			callback_yes = options;
			options = {};
		}

		options.className = "alert";
		options.title = "Confirm";
		options.width = 280;
		options.height = 140;
		if (typeof(content) == "string")
			content = "<p>" + content + "</p>";

		content +="<button class='yes-button' style='width:45%; margin-left: 10px'>Yes</button><button class='no-button' style='width:45%'>No</button>";
		options.noclose = true;
		var dialog = this.showMessage(content,options);
		$(dialog.content).find(".yes-button").click(function() {
			if(callback_yes) callback_yes();
			dialog.close();
		});

		$(dialog.content).find(".no-button").click(function() {
			if(callback_no) callback_no();
			dialog.close();
		});

		return dialog;
	},

	prompt: function(content,options, callback_yes, callback_no)
	{
		options = options || {};
		if(typeof(options) == "function")
		{
			callback_no = callback_yes;
			callback_yes = options;
			options = {};
		}

		options.className = "alert";
		options.title = "Prompt" || options.title;
		options.width = 280;
		options.height = 140 + (options.textarea ? 40 : 0);
		if (typeof(content) == "string")
			content = "<p>" + content + "</p>";

		var value = options.value || "";
		var textinput = "<input type='text' value='"+value+"'/>";
		if (options.textarea)
			textinput = "<textarea class='textfield' style='width:95%'>"+value+"</textarea>";

		content +="<p>"+textinput+"</p><button class='yes-button' style='width:45%; margin-left: 10px'>Accept</button><button class='no-button' style='width:45%'>Cancel</button>";
		options.noclose = true;
		var dialog = this.showMessage(content,options);
		$(dialog.content).find(".yes-button").click(function() {
			var input = $(dialog.content).find(options.textarea ? "textarea" : "input").val();

			if(callback_yes) callback_yes( input );
			dialog.close();
		});

		$(dialog.content).find(".no-button").click(function() {
			if(callback_no) callback_no();
			dialog.close();
		});

		return dialog;
	}
};


//Add support to get variables from the URL
$.extend({
  getUrlVars: function(){
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    return vars;
  },
  getUrlVar: function(name){
    return $.getUrlVars()[name];
  }
});

/****************** AREA **************/
/* Areas can be split several times horizontally or vertically to fit different colums or rows */
(function(){

	function Area(id, options)
	{
		options = options || {};
		/* the root element containing all sections */
		var element = document.createElement("div");
		element.className = "litearea";
		if(id) element.id = id;
		this.root = element;
		this.root.litearea = this; //dbl link
		this.options = options;

		var that = this;
		window.addEventListener("resize",function(e) { that.resize(e); });
		//$(this).bind("resize",function(e) { that.resize(e); });

		this._computed_size = [ $(this.root).width(), $(this.root).height() ];

		var element = document.createElement("div");
		if(options.content_id)
			element.id = options.content_id;
		element.className = "liteareacontent";
		element.style.width = "100%";
		element.style.height = "100%";
		this.root.appendChild(element);
		this.content = element;

		this.split_direction = "none";
		this.sections = [];

		if(options.main)
			$(LiteGUI).bind("resized", function() { 
				that.resize(); 
			});
	}

	/* get container of the section */
	Area.prototype.getSection = function(num)
	{
		num = num || 0;
		if(this.sections.length > num)
			return this.sections[num];
		return null;
	}

	Area.prototype.resize = function(e)
	{
		var computed_size = [ $(this.root).width(), $(this.root).height() ];
		if( e && this._computed_size && computed_size[0] == this._computed_size[0] && computed_size[1] == this._computed_size[1])
			return;

		if(this.sections.length)
			for(var i in this.sections)
			{
				var section = this.sections[i];
				section.resize(e);
				//$(section).trigger("resize"); //it is a LiteArea
				//$(section.root).trigger("resize");
				/*
				for (var j = 0; j < section.root.childNodes.length; j++)
					$(section.root.childNodes[j]).trigger("resize");
				*/
			}
		else //send it to the children
		{
			for (var j = 0; j < this.root.childNodes.length; j++)
			{
				var element = this.root.childNodes[j];
				if(element.litearea)
					element.litearea.resize();
				else
					$(element).trigger("resize");
			}
		}
	}

	Area.prototype.split = function(direction, sizes, editable)
	{
		direction = direction || "vertical";

		if(this.sections.length) throw "cannot split twice";

		//create areas
		var area1 = new LiteGUI.Area(null, { content_id: this.content.id });
		area1.root.style.display = "inline-block";
		var area2 = new LiteGUI.Area();
		area2.root.style.display = "inline-block";

		var splitinfo = "";
		var split_root = null;
		var dynamic_section = null;
		if(editable)
		{
			splitinfo = " - 5px";
			split_root = document.createElement("div");
			split_root.className = "litesplitbar " + direction;
			$(split_root).bind("mousedown", inner_mousedown);
		}

		sizes = sizes || ["50%",null];

		if(direction == "vertical")
		{
			area1.root.style.width = "100%";
			area2.root.style.width = "100%";

			if(sizes[0] == null)
			{
				area1.root.style.height = "-moz-calc( 100% - " + sizes[1] + splitinfo + " )";
				area1.root.style.height = "-webkit-calc( 100% - " + sizes[1] + splitinfo + " )";
				area1.root.style.height = "calc( 100% - " + sizes[1] + splitinfo + " )";
				area2.root.style.height = sizes[1];
				area2.size = sizes[1];
				dynamic_section = area1;
			}
			else if(sizes[1] == null)
			{
				area1.root.style.height = sizes[0];
				area1.size = sizes[0];
				area2.root.style.height = "-moz-calc( 100% - " + sizes[0] + splitinfo + " )";
				area2.root.style.height = "-webkit-calc( 100% - " + sizes[0] + splitinfo + " )";
				area2.root.style.height = "calc( 100% - " + sizes[0] + splitinfo + " )";
				dynamic_section = area2;
			}
			else
			{
				area1.root.style.height = sizes[0];
				area1.size = sizes[0];
				area2.root.style.height = sizes[1];
				area2.size = sizes[1];
			}
		}
		else //horizontal
		{
			area1.root.style.height = "100%";
			area2.root.style.height = "100%";

			if(sizes[0] == null)
			{
				area1.root.style.width = "-moz-calc( 100% - " + sizes[1] + splitinfo + " )";
				area1.root.style.width = "-webkit-calc( 100% - " + sizes[1] + splitinfo + " )";
				area1.root.style.width = "calc( 100% - " + sizes[1] + splitinfo + " )";
				area2.root.style.width = sizes[1];
				area2.size = sizes[1];
				dynamic_section = area1;
			}
			else if(sizes[1] == null)
			{
				area1.root.style.width = sizes[0];
				area1.size = sizes[0];
				area2.root.style.width = "-moz-calc( 100% - " + sizes[0] + splitinfo + " )";
				area2.root.style.width = "-webkit-calc( 100% - " + sizes[0] + splitinfo + " )";
				area2.root.style.width = "calc( 100% - " + sizes[0] + splitinfo + " )";
				dynamic_section = area2;
			}
			else
			{
				area1.root.style.width = sizes[0];
				area1.size = sizes[0];
				area2.root.style.width = sizes[1];
				area2.size = sizes[1];
			}
		}

		area1.root.removeChild( area1.content );
		area1.root.appendChild( this.content );
		area1.content = this.content;

		this.root.appendChild( area1.root );
		if(split_root)
			this.root.appendChild( split_root );
		this.root.appendChild( area2.root );

		this.sections = [area1, area2];
		this.dynamic_section = dynamic_section;
		this.direction = direction;

		//SPLITTER DRAGGER INTERACTION
		var that = this;
		var last_pos = [0,0];
		function inner_mousedown(e)
		{
			$(document).bind("mousemove",inner_mousemove);
			$(document).bind("mouseup",inner_mouseup);
			last_pos[0] = e.pageX;
			last_pos[1] = e.pageY;
			trace("Dragging");
			e.stopPropagation();
			e.preventDefault();
		}

		function inner_mousemove(e)
		{
			if(direction == "horizontal")
			{
				if (last_pos[0] != e.pageX)
					that.moveSplit(last_pos[0] - e.pageX);
			}
			else if(direction == "vertical")
			{
				if (last_pos[1] != e.pageY)
					that.moveSplit(last_pos[1] - e.pageY);
			}

			last_pos[0] = e.pageX;
			last_pos[1] = e.pageY;
			e.stopPropagation();
			e.preventDefault();
			if(that.options.inmediateResize)
				that.resize();
		}

		function inner_mouseup(e)
		{
			trace("Stop Dragging");
			$(document).unbind("mousemove",inner_mousemove);
			$(document).unbind("mouseup",inner_mouseup);
			that.resize();
		}
	}

	Area.prototype.moveSplit = function(delta)
	{
		if(!this.sections) return;

		var area1 = this.sections[0];
		var area2 = this.sections[1];
		var splitinfo = " - 2px";

		if(this.direction == "horizontal")
		{

			if (this.dynamic_section == area1)
			{
				var size = ($(area2.root).width() + delta) + "px";
				area1.root.style.width = "-moz-calc( 100% - " + size + splitinfo + " )";
				area1.root.style.width = "-webkit-calc( 100% - " + size + splitinfo + " )";
				area1.root.style.width = "calc( 100% - " + size + splitinfo + " )";
				area2.root.style.width = size;
			}
			else
			{
				var size = ($(area1.root).width() - delta) + "px";
				area1.root.style.width = size;
				area2.root.style.width = "-moz-calc( 100% - " + size + splitinfo + " )";
				area2.root.style.width = "-webkit-calc( 100% - " + size + splitinfo + " )";
				area2.root.style.width = "calc( 100% - " + size + splitinfo + " )";
			}
		}
		else if(this.direction == "vertical")
		{
			if (this.dynamic_section == area1)
			{
				var size = ($(area2.root).height() + delta) + "px";
				area1.root.style.height = "-moz-calc( 100% - " + size + splitinfo + " )";
				area1.root.style.height = "-webkit-calc( 100% - " + size + splitinfo + " )";
				area1.root.style.height = "calc( 100% - " + size + splitinfo + " )";
				area2.root.style.height = size;
			}
			else
			{
				var size = ($(area1.root).height() + delta) + "px";
				area1.root.style.height = size;
				area2.root.style.height = "-moz-calc( 100% - " + size + splitinfo + " )";
				area2.root.style.height = "-webkit-calc( 100% - " + size + splitinfo + " )";
				area2.root.style.height = "calc( 100% - " + size + splitinfo + " )";
			}
		}
	}

	Area.prototype.setAreaSize = function(area,size)
	{
		var element = this.sections[1];

		var splitinfo = " - 2px";
		element.root.style.width = "-moz-calc( 100% - " + size + splitinfo + " )";
		element.root.style.width = "-webkit-calc( 100% - " + size + splitinfo + " )";
		element.root.style.width = "calc( 100% - " + size + splitinfo + " )";
	}

	Area.prototype.merge = function(main_section)
	{
		if(this.sections.length == 0) throw "not splitted";

		var main = this.sections[main_section || 0];

		this.root.appendChild( main.content );
		this.content = main.content;

		this.root.removeChild( this.sections[0].root );
		this.root.removeChild( this.sections[1].root );

		/*
		while(main.childNodes.length > 0)
		{
			var e = main.childNodes[0];
			this.root.appendChild(e);
		}

		this.root.removeChild( this.sections[0].root );
		this.root.removeChild( this.sections[1].root );
		*/

		this.sections = [];
		this._computed_size = null;
		this.resize();
	}

	Area.prototype.hideSection = function(section)
	{
		if(this.sections.length == 0) throw "not splitted";

		
	}

	LiteGUI.Area = Area;

	/***************** SPLIT ******************/
	function Split(id, sections, options)
	{
		options = options || {};

		var root = document.createElement("div");
		this.root = root;
		root.id = id;
		root.className = "litesplit " + (options.vertical ? "vsplit" : "hsplit");
		this.sections = [];

		for(var i in sections)
		{
			var section = document.createElement("div");
			section.className = "split-section split" + i;
			if(typeof(sections[i]) == "number")
			{
				if(options.vertical)
					section.style.height = sections[i].toFixed(1) + "%";
				else
					section.style.width = sections[i].toFixed(1) + "%";
			}
			else if(typeof(sections[i]) == "string")
			{
				if(options.vertical)
					section.style.height = sections[i];
				else
					section.style.width = sections[i];
			}
			else
			{
				if(sections[i].id) section.id = sections[i].id;
				if(options.vertical)
					section.style.height = (typeof(sections[i].height) == "Number" ? sections[i].height.toFixed(1) + "%" : sections[i].height);
				else
					section.style.width = (typeof(sections[i].width) == "Number" ? sections[i].width.toFixed(1) + "%" : sections[i].width);
			}

			this.sections.push(section);
			root.appendChild(section);
		}

		if(options.parent)
		{
			if(options.parent.root)
				options.parent.root.appendChild(root);
			else
				options.parent.appendChild(root);
		}
	}

	LiteGUI.Split = Split;


	/****************** PANEL **************/
	function Panel(id, options)
	{
		options = options || {};
		this.width = options.width || 200;
		this.height = options.height || 100;
		this.content = options.content || "";

		var panel = document.createElement("div");
		panel.id = id;
		panel.className = "litepanel " + (options.className || "");
		panel.data = this;

		var code = "";
		if(options.title)
		{
			code += "<div class='panel-header'>"+options.title+"</div><div class='buttons'>";
			if(options.minimize){
				code += "<button class='mini-button minimize-button'></button>";
				code += "<button class='mini-button maximize-button' style='display:none'></button>";
			}
			if(options.hide)
				code += "<button class='mini-button hide-button'></button>";
			
			if(options.close) code += "<button class='mini-button close-button'></button>";
			code += "</div>";
		}

		code += "<div class='content'>"+this.content+"</div><div class='panel-footer'></div>";
		panel.innerHTML = code;

		this.root = panel;
		this.content = $(panel).find(".content")[0];

		if(options.buttons)
		{
			for(var i in options.buttons)
				this.addButton(options.buttons[i].name, options.buttons[i]);
		}

		//if(options.scroll == false)	this.content.style.overflow = "hidden";
		if(options.scroll == true)	this.content.style.overflow = "auto";

		$(panel).find(".close-button").bind("click",function() { panel.data.close(); });
		$(panel).find(".minimize-button").bind("click",function() { panel.data.minimize(); });
		$(panel).find(".maximize-button").bind("click",function() { panel.data.maximize(); });
		$(panel).find(".hide-button").bind("click",function() { panel.data.hide(); });

		this.makeDialog(options);
	}

	Panel.MINIMIZED_WIDTH = 200;
	Panel.title_height = "20px";

	Panel.prototype.makeDialog = function(options)
	{
		options = options || {};

		var panel = this.root;
		panel.style.position = "absolute";
		panel.style.display = "none";
		panel.style.width = this.width + "px";
		if(this.height)
			panel.style.height = this.height + "px";

		if(this.height)
			$(panel).find(".content").css({height: this.height - 20});

		panel.style.boxShadow = "0 0 3px black";

		if(options.draggable)
		{
			this.draggable = true;
			$(panel).draggable({handle:".panel-header"});
		}

		//$(panel).bind("click",function(){});

		$(LiteGUI.root_container).append(this.root);
		this.center();
	}

	Panel.prototype.dockTo = function(parent, dock_type)
	{
		if(!parent) return;
		var panel = this.root;

		panel.style.top = 0;
		panel.style.left = 0;

		panel.style.boxShadow = "0 0 0";

		if(dock_type == "full")
		{
			panel.style.position = "relative";
			panel.style.width = "100%";
			panel.style.height = "100%";
			this.content.style.width = "100%";
			this.content.style.height = "calc(100% - "+ LiteGUI.Panel.title_height +")"; //title offset: 20px
			this.content.style.height = "-moz-calc(100% - "+ LiteGUI.Panel.title_height +")";
			this.content.style.height = "-webkit-calc(100% - "+ LiteGUI.Panel.title_height +")"; 
			this.content.style.overflow = "auto";
		}
		else if(dock_type == 'left' || dock_type == 'right')
		{
			panel.style.position = "absolute";
			panel.style.top = 0;
			panel.style[dock_type] = 0;

			panel.style.width = this.width + "px";
			panel.style.height = "100%";

			this.content.style.height = "-moz-calc(100% - "+ LiteGUI.Panel.title_height +")";
			this.content.style.height = "-webkit-calc(100% - "+ LiteGUI.Panel.title_height +")";
			this.content.style.height = "calc(100% - "+ LiteGUI.Panel.title_height +")";
			this.content.style.overflow = "auto";

			if(dock_type == 'right')
			{
				panel.style.left = "auto";
				panel.style.right = 0;
			}
		}
		else if(dock_type == 'bottom' || dock_type == 'top')
		{
			panel.style.width = "100%";
			panel.style.height = this.height + "px";
			if(dock_type == 'bottom')
			{
				panel.style.bottom = 0;
				panel.style.top = "auto";
			}
		}

		if(this.draggable)
			$(panel).draggable({disabled: true});

		if(parent.content)
			parent.content.appendChild(panel);
		else if( typeof(parent) == "string")
			$(parent).append(panel)
		else
			parent.appendChild(panel); 
	}

	Panel.prototype.addButton = function(name,options)
	{
		var that = this;
		var button = document.createElement("button");

		button.innerHTML = name;
		if(options.className) button.className = options.className;

		$(this.root).find(".panel-footer").append(button);

		$(button).bind("click", function() { 
			if(options.callback)
				options.callback();

			if(options.close)
				that.close();
		});

		return button;
	}

	Panel.prototype.close = function(v) {
		$(this).trigger("closed");

		if(!v)
		{
			trace("Panel closed");
			$(this.root).remove();
			return
		}

		$(this.root).hide('fade',null,function() {
			trace("Panel closed");
			$(this).remove();
		});
	}


	Panel.minimized = [];

	Panel.prototype.minimize = function() {
		if(this.minimized) return;

		this.minimized = true;
		this.old_pos = $(this.root).position();

		$(this.root).find(".content").hide();
		$(this.root).draggable({ disabled: true });
		$(this.root).find(".minimize-button").hide();
		$(this.root).find(".maximize-button").show();
		$(this.root).css({width: LiteGUI.Panel.MINIMIZED_WIDTH});


		$(this).bind("closed", function() {
			LiteGUI.Panel.minimized.splice( LiteGUI.Panel.minimized.indexOf( this ), 1);
			LiteGUI.Panel.arrangeMinimized();
		});

		LiteGUI.Panel.minimized.push( this );
		LiteGUI.Panel.arrangeMinimized();

		$(this).trigger("minimizing");
	}

	Panel.arrangeMinimized = function()
	{
		var pos = $(LiteGUI.root_container).height() - 20;
		for(var i in LiteGUI.Panel.minimized)
			$(LiteGUI.Panel.minimized[i].root).animate({ left: LiteGUI.Panel.MINIMIZED_WIDTH * i, top: pos + "px" },100);
	}

	Panel.prototype.maximize = function() {
		if(!this.minimized) return;
		this.minimized = false;

		$(this.root).find(".content").show();
		$(this.root).draggable({ disabled: false });
		$(this.root).animate({ left: this.old_pos.left+"px" , top: this.old_pos.top + "px", width: this.width },100);
		$(this.root).find(".minimize-button").show();
		$(this.root).find(".maximize-button").hide();

		LiteGUI.Panel.minimized.splice( LiteGUI.Panel.minimized.indexOf( this ), 1);
		LiteGUI.Panel.arrangeMinimized();
		$(this).trigger("maximizing");
	}

	Panel.prototype.makeModal = function()
	{
		LiteGUI.showModalBackground(true);
		$(LiteGUI.modalbg_div).append( this.root ); //add panel
		$(this.root).draggable({ disabled: true });
		this.show();
		this.center();

		$(this).bind("closed", inner );

		function inner(e)
		{
			trace("closing");
			LiteGUI.showModalBackground(false);
		}
	}

	Panel.prototype.bringToFront = function()
	{
		var parent = $(this.root).parent();
		parent.detach(this.root);
		parent.attach(this.root);
	}

	Panel.prototype.show = function(v,callback)
	{
		$(this.root).show(v,null,100,callback);
		$(this).trigger("shown");
	}

	Panel.prototype.hide = function(v,callback)
	{
		$(this.root).hide(v,null,100,callback);
		$(this).trigger("hidden");
	}

	Panel.prototype.setPosition = function(x,y)
	{
		this.root.position = "absolute";
		this.root.style.left = x + "px";
		this.root.style.top = y + "px";
	}


	Panel.prototype.center = function()
	{
		this.root.position = "absolute";
		this.root.style.left = Math.floor(( $(this.root.parentNode).width() - $(this.root).width() ) * 0.5) + "px";
		this.root.style.top = Math.floor(( $(this.root.parentNode).height() - $(this.root).height() ) * 0.5) + "px";
	}

	LiteGUI.Panel = Panel;
	LiteGUI.Dialog = Panel;

	/**************  ***************************/

	function Tabs(id,options)
	{
		options = options || {};

		var element = document.createElement("DIV");
		if(id) element.id = id;
		element.data = this;
		element.className = "litetabs";
		this.root = element;

		this.current_tab = "";

		if(options.height)
		{
			if(options.height == "full")
				this.root.style.height = "100%";
			else
				this.root.style.height = options.height;
		}

		//container of tab elements
		var list = document.createElement("UL");
		list.className = "wtabcontainer";
		this.list = list;
		this.root.appendChild(this.list);

		this.contents = {};
		this.selected = null;

		this.onchange = options.callback;

		if(options.parent)
			this.appendTo(options.parent);
	}

	Tabs.tabs_height = "30px";

	Tabs.prototype.appendTo = function(parent,at_front)
	{
		if(at_front)
			$(parent).prepend(this.root);
		else
			$(parent).append(this.root);
	}

	Tabs.prototype.get = function(name)
	{
		return this.contents[name];
	}

	Tabs.prototype.add = function(name,options)
	{
		options = options || {};
		var that = this;

		var element = document.createElement("LI");
		element.className = "wtab wtab-" + name.replace(/ /gi,"_");
		//if(options.selected) element.className += " selected";
		element.data = name;
		element.innerHTML = name;

		$(this.list).append(element);

		var content = document.createElement("div");
		if(options.id)
			content.id = options.id;
		content.className = "wtabcontent " + "wtabcontent-" + name + " " + (options.className || "");
		content.data = name;
		content.style.display = "none";
		if(options.height)
		{
			content.style.overflow = "auto";
			if(options.height == "full")
			{
				content.style.height = "calc( 100% - "+LiteGUI.Tabs.tabs_height+" )"; //minus title
				content.style.height = "-moz-calc( 100% - "+LiteGUI.Tabs.tabs_height+" )"; //minus title
				content.style.height = "-webkit-calc( 100% - "+LiteGUI.Tabs.tabs_height+" )"; //minus title
				//content.style.height = "-webkit-calc( 90% )"; //minus title
			}
			else
				content.style.height = options.height;
		}
		if(options.content)
		{
			if (typeof(options.content) == "string")
				content.innerHTML = options.content;
			else
				content.appendChild(options.content);
		}

		$(this.root).append(content);
		this.contents[ name ] = content;

		//when clicked
		$(element).click(function(e) {
			if($(this).hasClass("selected")) return;

			var tabname = this.data;
			var tab = null;

			for(var i in that.contents)
				if( i == tabname )
				{
					$(that.contents[i]).show();
					tab = that.contents[i];
				}
				else
					$(that.contents[i]).hide();

			$(that.list).find("li.wtab").removeClass("selected");
			$(this).addClass("selected");
			if( that.current_tab && 
				that.current_tab[0] != tabname && 
				that.current_tab[2] && 
				that.current_tab[2].callback_leave)
					that.current_tab[2].callback_leave( that.current_tab[0], that.current_tab[1], that.current_tab[2] );
			that.current_tab = [tabname, tab, options];
			if(options.callback) options.callback(tabname, tab);
			$(that).trigger("wchange",[tabname,tab]);
			if(that.onchange) that.onchange(name,tabname,tab);
			that.selected = name;
		});

		this.list.appendChild(element);

		if (options.selected == true || this.selected == null)
			this.select(name);

		return $(element);
	}

	Tabs.prototype.select = function(name)
	{
		var tabs = $(this.list).find("li.wtab");
		for(var i = 0; i < tabs.length; i++)
			if( name == tabs[i].data)
			{
				$(tabs[i]).click();
				break;
			}
	}

	LiteGUI.Tabs = Tabs;


	/************** MENUBAR ************************/

	function Menubar(id)
	{
		this.menu = [];
		this.panels = [];

		this.root = document.createElement("div");
		this.root.id = id;
		this.root.className = "litemenubar";

		this.content = document.createElement("ul");
		this.root.appendChild( this.content );

		this.is_open = false;
	}

	Menubar.closing_time = 500;

	Menubar.prototype.clear = function()
	{
		$(this.content).empty();
		this.menu = [];
		this.panels = [];
	}

	Menubar.prototype.attachToPanel = function(panel)
	{
		$(panel.content).prepend(this.root);
	}

	Menubar.prototype.add = function(path, data)
	{
		data = data || {};

		var prev_length = this.menu.length;

		var tokens = path.split("/");
		var current_token = 0;
		var current_pos = 0;
		var menu = this.menu;

		while(menu)
		{
			//token not found in this menu, create it
			if(menu.length == current_pos)
			{
				var v = { children: []};
				if(current_token == tokens.length - 1)
					v.data = data;

				v.disable = function() { if( this.data ) this.data.disabled = true; }
				v.enable = function() { if( this.data ) delete this.data.disabled; }

				v.name = tokens[current_token];
				menu.push(v);
				current_token++;
				if(current_token == tokens.length)
					break;
				v.children = [];
				menu = v.children;
				current_pos = 0;
				continue;
			}

			//token found in this menu, get inside for next token
			if(menu[current_pos] && tokens[current_token] == menu[current_pos].name)
			{
				if(current_token < tokens.length)
				{
					menu = menu[current_pos].children;
					current_pos = 0;
					current_token++;
					continue;
				}
				else //last token
				{
					trace("Warning: Adding menu that already exists: " + path );
					break;
				}
			}
			current_pos++;
		}

		if(prev_length != this.menu.length)
			this.updateMenu();
	};

	Menubar.prototype.separator = function(path, order)
	{
		var menu = this.findMenu(path);
		if(!menu) return;
		menu.push( {separator: true, order: order || 10 } );
	}


	Menubar.prototype.findMenu = function(path)
	{
		var tokens = path.split("/");
		var current_token = 0;
		var current_pos = 0;
		var menu = this.menu;

		while(menu)
		{
			if(current_token == tokens.length)
				return menu;

			if(menu.length <= current_pos)
				return null;

			if(tokens[current_token] == "*")
				return menu[current_pos].children;

			//token found in this menu, get inside for next token
			if(tokens[current_token] == menu[current_pos].name)
			{
				if(current_token < tokens.length)
				{
					menu = menu[current_pos].children;
					current_pos = 0;
					current_token++;
					continue;
				}
				else //last token
				{
					return menu[current_pos];
				}
			}
			current_pos++;
		}
		return null;
	}

	//update top main menu
	Menubar.prototype.updateMenu = function()
	{
		var that = this;

		$(this.content).empty();
		for(var i in this.menu)
		{
			var element = document.createElement("li");
			element.innerHTML = "<span class='icon'></span><span class='name'>" + this.menu[i].name + "</span>";
			this.content.appendChild(element);
			element.data = this.menu[i];
			this.menu[i].element = element;

			/* ON CLICK TOP MAIN MENU ITEM */
			$(element).bind("click", function(e) {
				var item = this.data;

				if(item.data && item.data.callback && typeof(item.data.callback) == "function")
					item.data.callback(item.data);

				if(!that.is_open)
				{
					//$(document).bind("click",inner_outside);
					that.is_open = true;
					that.showMenu( item, e, this );
				}
				else
				{
					that.is_open = false;
					that.hidePanels();
				}
			});

			$(element).bind("mouseover", function(e) {
				that.hidePanels();
				if(that.is_open)
					that.showMenu( this.data, e, this );
			});
		}
	}

	Menubar.prototype.hidePanels = function() {
		if(!this.panels.length) return;

		for(var i in this.panels)
			$(this.panels[i]).remove();
		this.panels = [];
	}

	//Create the panel with the drop menu
	Menubar.prototype.showMenu = function(menu, e, root, is_submenu) {

		if(!is_submenu)
			this.hidePanels();

		if(!menu.children || !menu.children.length) return;
		var that = this;
		if(that.closing_by_leave) clearInterval(that.closing_by_leave);

		var element = document.createElement("div");
		element.className = "litemenubar-panel";

		var sorted_entries = [];
		for(var i in menu.children)
			sorted_entries.push(menu.children[i]);

		sorted_entries.sort(function(a,b) {
			var a_order = 10;
			var b_order = 10;
			if(a && a.data && a.data.order != null) a_order = a.data.order;
			if(a && a.separator && a.order != null) a_order = a.order;
			if(b && b.data && b.data.order != null) b_order = b.data.order;
			if(b && b.separator && b.order != null) b_order = b.order;
			return a_order - b_order;
		});

		for(var i in sorted_entries)
		{
			var item = document.createElement("p");
			var menu_item = sorted_entries[i];

			item.className = 'litemenu-entry ' + ( item.children ? " submenu" : "" );
			if(menu_item && menu_item.name)
				item.innerHTML = "<span class='icon'></span><span class='name'>" + menu_item.name + (menu_item.children && menu_item.children.length ? "<span class='more'>+</span>":"") + "</span>";
			else
				item.innerHTML = "<span class='separator'></span>";

			item.data = menu_item;

			//check if it has to show the item being 'checked'
			if( item.data.data )
			{
				var data = item.data.data;

				var checked = (data.type == "checkbox" && data.instance && data.property && data.instance[ data.property ] == true) || 
					data.checkbox == true ||
					(data.instance && data.property && data.hasOwnProperty("value") && data.instance[data.property] == data.value) ||
					(typeof( data.isChecked ) == "function" && data.isChecked.call(data.instance, data) );

				if(checked)
					item.className += " checked";

				if(data.disabled)
					item.className += " disabled";
			}

			/* ON CLICK SUBMENU ITEM */
			$(item).bind("click",function(){
				var item = this.data;
				if(item.data)
				{
					if(item.data.disabled)
						return;

					//to change variables directly
					if(item.data.instance && item.data.property)
					{
						if( item.data.type == "checkbox" )
						{
							item.data.instance[item.data.property] = !item.data.instance[item.data.property];
							if(	item.data.instance[item.data.property] )
								$(this).addClass("checked");
							else
								$(this).removeClass("checked");
						}
						else if( item.data.hasOwnProperty("value") )
						{
							item.data.instance[item.data.property] = item.data.value;
						}
					}

					//to have a checkbox behaviour
					if(item.data.checkbox != null)
					{
						item.data.checkbox = !item.data.checkbox;
						if(	item.data.checkbox )
							$(this).addClass("checked");
						else
							$(this).removeClass("checked");
					}

					//execute a function
					if(item.data.callback && typeof(item.data.callback) == "function")
						item.data.callback(item.data);
				}

				//more menus
				if(item.children && item.children.length)
				{
					that.showMenu( item, e, this, true );
				}
				else
				{
					that.is_open = false;
					that.hidePanels();
				}
			});
			$(element).append(item);
		}

		$(element).bind("mouseleave",function(e){
			//if( $(e.target).hasClass("litemenubar-panel") || $(e.target).parents().hasClass("litemenubar-panel") ) 	return;
			
			if(that.closing_by_leave) clearInterval(that.closing_by_leave);
			that.closing_by_leave = setTimeout( function() { 
				that.is_open = false;
				that.hidePanels();
			},LiteMenubar.closing_time);
		});

		$(element).bind("mouseenter",function(e){
			if(that.closing_by_leave) clearInterval(that.closing_by_leave);
			that.closing_by_leave = null;
		});

		var jQ = $(root); //$(menu.element);
		element.style.left = jQ.offset().left + ( is_submenu ? 200 : 0 ) + "px";
		element.style.top = jQ.offset().top + jQ.height() + ( is_submenu ? -20 : 2 ) + "px";

		this.panels.push(element);
		$(document.body).append(element);
		$(element).hide().show();
	}

	LiteGUI.Menubar = Menubar;

	/******* LiteContextualMenu *******************/

	function ContextualMenu(values,options)
	{
		options = options || {};
		this.options = options;
		var that = this;

		var root = document.createElement("div");
		root.className = "litecontextualmenu litemenubar-panel";
		root.style.minWidth = 100;
		root.style.minHeight = 100;
		this.root = root;
		
		for(var i in values)
		{
			var element = document.createElement("div");
			element.className = "litemenu-entry submenu";

			element.dataset["value"] = values[i];
			element.innerHTML = values.constructor == Array ? values[i] : i;
			root.appendChild(element);
		}

		$(root).find(".litemenu-entry").click(function(e) {
			var value = this.dataset["value"];
			if(options.callback)
				options.callback.call(that, value );
			document.body.removeChild(root);
		});

		$(root).mouseleave(function(e) {
			document.body.removeChild(root);
		});

		//insert before checking position
		document.body.appendChild(root);

		var left = options.left || 0;
		var top = options.top || 0;
		if(options.event)
		{
			left = (options.event.pageX - 10);
			top = (options.event.pageY - 10);

			var rect = document.body.getClientRects()[0];
			if(left > (rect.width - $(root).width() - 10))
				left = (rect.width - $(root).width() - 10);
			if(top > (rect.height - $(root).height() - 10))
				top = (rect.height - $(root).height() - 10);
		}

		root.style.left = left + "px";
		root.style.top = top  + "px";
	}

	LiteGUI.ContextualMenu = ContextualMenu;

	/*********** LiteTree *****************************/

	function Tree(id,data,options)
	{
		var root = document.createElement("div");
		this.root = root;
		root.id = id;
		root.className = "litetree";
		this.tree = data;
		var that = this;
		options = options || {allow_rename: true, drag: true};
		this.options = options;

		var root_item = this.createTreeItem(data,options);
		root_item.className += " root_item";
		this.root.appendChild(root_item);
		this.root_item = root_item;
	}

	Tree.prototype.updateTree = function(data)
	{
		if(this.root_item)
			$(this.root_item).remove();
		if(!data) return;

		var root_item = this.createTreeItem(data,this.options);
		root_item.className += " root_item";
		this.root.appendChild(root_item);
		this.root_item = root_item;
	}

	Tree.prototype.createTreeItem = function(data,options)
	{
		var root = document.createElement("li");
		root.className = "ltreeitem";
		if(data.id) root.id = data.id;
		root.data = data;
		data.DOM = root;
		options = options || this.options;

		var content_element = document.createElement("div");
		content_element.className = "ltreecontent";
		content_element.innerHTML = data.content || data.id || "";
		//root.dataset["item"] = data.id || data.content || "";

		root.appendChild(content_element);
		root.content_element = content_element;

		$(root).find(".ltreecontent").click(onNodeSelected);
		$(root).find(".ltreecontent").dblclick(onNodeDblClicked);

		var list = document.createElement("ul");
		list.className = "ltreelist";
		root.list = list;
		if(data.children)
		{
			for(var i in data.children)
			{
				var item = data.children[i];
				var element = this.createTreeItem(item, options);
				list.appendChild(element);
			}
		}
		root.appendChild(list);

		var that = this;
		function onNodeSelected(e)
		{
			if(this._editing) return;

			$(that.root).removeClass("selected");
			$(that.root).find(".ltreecontent.selected").removeClass("selected");
			$(this).addClass("selected");
			var item = this.parentNode;
			$(that).trigger("item_selected", [item.data, item] );
			if(item.callback) item.callback.call(that,item);
		}

		function onNodeDblClicked(e)
		{
			var item = this.parentNode;
			$(that).trigger("item_dblclicked", [item.data, item] );

			if(!this._editing && that.options.allow_rename)
			{
				this._editing = true;
				this._old_name = this.innerHTML;
				var that2 = this;
				this.innerHTML = "<input type='text' value='" + this.innerHTML + "' />";
				var input = $(this).find("input")[0];
				$(input).blur(function(e) { 
					that2.innerHTML = e.target.value;
					delete that2._editing;
					$(that).trigger("item_renamed", [that2._old_name, e.target.value, item]);
					delete that2._old_name;
				});
				$(input).bind("keydown", function(e) {
					if(e.keyCode != 13)
						return;
					$(this).blur();
				});
				$(input).focus();
				e.preventDefault();
			}
			
		}

		//dragging tree
		var draggable_element = content_element;
		draggable_element.draggable = true;

		//starts dragging this element
		draggable_element.addEventListener("dragstart", function(ev) {
			//trace("DRAGSTART!");
			//this.removeEventListener("dragover", on_drag_over ); //avoid being drag on top of himself
			ev.dataTransfer.setData("node-id", this.parentNode.id);
		});

		//something being dragged entered
		draggable_element.addEventListener("dragenter", function (ev)
		{
			//trace("ENTER!");
			//if(ev.srcElement == this) return;
			ev.preventDefault();
		});

		//allows to drag stuff on top?
		draggable_element.addEventListener("dragover", on_drag_over );
		function on_drag_over(ev)
		{
			ev.preventDefault();
		}

		draggable_element.addEventListener("drop", function (ev)
		{
			ev.preventDefault();
			var node_id = ev.dataTransfer.getData("node-id");

			//trace("DROP! \"" + node_id + "\"");
			//var data = ev.dataTransfer.getData("Text");
			if(node_id != "")
			{
				try
				{
					if( that.moveItem(node_id, this.parentNode.id ) )
						$(that).trigger("item_moved", [ that.getItem(node_id), that.getItem(this.parentNode.id) ] );
				}
				catch (err)
				{
					trace("Error: " + err );
				}
			}
			else
			{
				$(that).trigger("drop_on_item", [this, ev] );
			}
		});


		return root;
	}

	Tree.prototype.getItem = function(id)
	{
		var node = $(this.root).find("#"+id);
		if(!node.length) return null;
		if( !$(node).hasClass("ltreeitem") )
			throw("this node is not a tree item");
		return node[0];
	}

	Tree.prototype.setSelectedItem = function(id)
	{
		if(!id)
		{
			$(this.root).removeClass("selected");
			$(this.root).find(".ltreecontent.selected").removeClass("selected");
			return;
		}

		var node = this.getItem(id);
		if(!node) return null;
		if( $(node).hasClass("selected") ) return node;

		$(this.root).removeClass("selected");
		$(this.root).find(".ltreecontent.selected").removeClass("selected");
		$(node.content_element).addClass("selected");
		return node;
	}


	Tree.prototype.getSelectedItem = function()
	{
		var node = $(that.root).find(".ltreecontent.selected");
		if(!node.length) return null;
		return node[0];
	}

	Tree.prototype.insertItem = function(data, id_parent, position, options)
	{
		var parent = this.root_item;
		if(id_parent)
		{
			if(typeof(id_parent) == "string")
				parent = this.getItem(id_parent);
			else
				parent = id_parent;
			if(!parent)
				return null; //not found
		}
		if( !$(parent).hasClass("ltreeitem") )
			throw("this node is not a tree item");

		var element = this.createTreeItem(data, options);
		if(position == undefined)
			parent.list.appendChild( element );
		else
		{
			trace(parent.list.childNodes);
			parent.list.insertBefore(element, parent.list.childNodes[position]);
		}

		return element;
	}

	Tree.prototype.moveItem = function(id, id_parent)
	{
		var parent = this.getItem(id_parent);
		var node = this.getItem(id);
		if(!parent || !node)
			return false;
		parent.list.appendChild( node );
		return true;
	}

	Tree.prototype.removeItem = function(id)
	{
		var node = this.getItem(id);
		if(node)
			$(node).remove();
	}

	Tree.prototype.updateItem = function(id, data)
	{
		var node = this.getItem(id);
		if(!node) return;

		node.data = data;
		if(data.id)
			node.id = data.id;
		if(data.content)
			node.content_element.innerHTML = data.content;
	}

	Tree.prototype.clear = function(keep_root)
	{
		$(keep_root ? this.root_item : this.root).find(".ltreeitem").remove();
	}

	LiteGUI.Tree = Tree;

	/******* LiteList ***********************/

	function List(id,items,options)
	{
		options = options || {};

		var root = document.createElement("ul");
		this.root = root;
		root.id = id;
		root.className = "litelist";
		this.items = [];
		var that = this;

		this.callback = options.callback;

		for(var i in items)
		{
			var item = document.createElement("li");
			item.className = "list-item";
			item.data = items[i];

			var content = "";
			if(typeof(items[i]) == "string")
				content = items[i] + "<span class='arrow'></span>";
			else
			{
				content = (items[i].name || items[i].title || "") + "<span class='arrow'></span>";
				if(items[i].id)	item.id = items[i].id;
			}
			item.innerHTML = content;

			root.appendChild(item);
		}

		$(root).find(".list-item").click( function() {
			$(root).find(".list-item.selected").removeClass("selected");
			$(this).addClass("selected");

			$(that).trigger("wchanged", this);
			if(that.callback)
				that.callback( this.data  );
		});

		if(options.parent)
		{
			if(options.parent.root)
				$(options.parent.root).append(root);
			else
				$(options.parent).append(root);
		}
	}

	LiteGUI.List = List;

})();
/* Attributes editor panel 
	Dependencies: 
		- jQuery
		- jQuery UI (sliders)
		- jscolor.js
*/

/* LiteWiget options:
	+ name_width: the width of the widget name area

*/

jQuery.fn.wchange = function(callback) {
	$(this[0]).bind("wchange",callback);
};

jQuery.fn.wclick = function(callback) {
	$(this[0]).bind("wclick",callback);
};

function Inspector(id,options)
{
	options = options || {};
	this.root = document.createElement("DIV");
	this.root.className = "inspector " + ( options.full ? "full" : "");
	if(options.one_line)
		this.root.className += " one-line";

	if(id) this.root.id = id;

	this.values = {};
	this.sections = [];
	this.widgets = {};

	this.addSection();
	this.tab_index = Math.floor(Math.random() * 10000);

	if(options.name_width)
		this.widget_name_width = options.name_width;

	if(options.parent) this.appendTo(options.parent);
	this.widgets_per_row = options.widgets_per_row || 1;
}

Inspector.prototype.appendTo = function(parent, at_front)
{
	if(at_front)
		$(parent).prepend(this.root);
	else
		$(parent).append(this.root);
}

Inspector.prototype.clear = function()
{
	$(this.root).empty();

	this.sections = [];
	this.values = {};
	this.widgets = {};

	this.addSection();
}

Inspector.prototype.append = function(widget)
{
	var root = this.root;
	if(this.current_group_content)
		root = this.current_group_content;
	else if(this.current_section_content)
		root = this.current_section_content;
	root.appendChild(widget);
}

Inspector.prototype.setup = function(info)
{
	for(var i in info)
	{
		var w = info[i];
		var widget = this.add(w.type,w.name,w.value,w.options);
	}
}

Inspector.prototype.createWidget = function(name, content, options) 
{
	options = options || {};
	content = content || "";
	var element = document.createElement("DIV");
	element.className = "widget " + (options.className || "");
	element.inspector = this;
	element.options = options;
	element.name = name;
	if(options.width)
	{
		element.style.width = typeof(options.width) == "string" ? options.width : options.width + "px";
		element.style.minWidth = element.style.width;
	}

	if(name)
		this.widgets[name] = element;

	if(this.widgets_per_row != 1)
	{
		if(!options.width)
			element.style.width = (100 / this.widgets_per_row).toFixed(2) + "%";
		element.style.display = "inline-block";
	}

	var namewidth = "";
	var contentwidth = "";
	if(this.widget_name_width || options.widget_name_width)
	{
		var w = this.widget_name_width || options.widget_name_width;
		if(typeof(w) == "number") w = w.toFixed() + "px";
		namewidth = "style='width: calc(" + w + " - 0px); width: -webkit-calc(" + w + " - 0px); width: -moz-calc(" + w + " - 0px); '"; //hack 
		contentwidth = "style='width: calc( 100% - " + w + "); width: -webkit-calc(100% - " + w + "); width: -moz-calc( 100% - " + w + "); '";
	}

	var code = "";
	var content_class = "wcontent ";
	if(name == null)
		content_class += " full";
	else if(name == "")
		code = "<span class='wname' title='"+name+"' "+namewidth+"></span>";
	else
		code = "<span class='wname' title='"+name+"' "+namewidth+">"+name+"<span class='filling'>....................</span> </span>";

	if(typeof(content) == "string")
		element.innerHTML = code + "<span class='info_content "+content_class+"' "+contentwidth+">"+content+"</span>";
	else
	{
		element.innerHTML = code + "<span class='info_content "+content_class+"' "+contentwidth+"></span>";
		$(element).find("span.info_content").append(content);
	}

	return element;
}

Inspector.onWidgetChange = function(element, name, value, options)
{
	this.values[name] = value;
	$(this.current_section).trigger("wchange",value); //used for undo
	if(options.callback)
		options.callback.call(element,value);
	$(element).trigger("wchange",value);
	if(this.onchange) this.onchange(name,value,element);
}

Inspector.widget_constructors = {
	title: 'addTitle',
	info: 'addInfo',
	number: 'addNumber',
	slider: 'addSlider',
	string: 'addString',
	text: 'addString',
	textarea: 'addTextarea',
	slider: 'addSlider',
	color: 'addColor',
	checkbox: 'addCheckbox',
	vector2: 'addVector2',
	vector3: 'addVector3',
	combo: 'addCombo',
	button: 'addButton',
	buttons: 'addButtons',
	file: 'addFile',
	line: 'addLine',
	list: 'addList',
	separator: 'addSeparator'
};

Inspector.prototype.add = function(type,name,value,options)
{
	if(typeof(type) == "object" && arguments.length == 1)
	{
		options = type;
		type = options.type;
		name = options.name;
		value = options.value;
	}

	var func = Inspector.widget_constructors[type];
	if(!func) return;

	if(typeof(func) == "string")
		func = Inspector.prototype[func];
	if(!func) return;
	if(typeof(func) != "function") return;

	if(typeof(options) == 'function')
		options = { callback: options };
	
	return func.call(this, name,value, options);
}

Inspector.prototype.getValue = function(name)
{
	return this.values[name];
}

Inspector.prototype.set = function(name, value)
{
	//TODO
}

Inspector.prototype.addSection = function(name, options)
{
	options = options || {};

	if(this.current_group)
		this.endGroup();

	var element = document.createElement("DIV");
	element.className = "wsection";
	if(!name) element.className += " notitle";
	var code = "";
	if(name) code += "<div class='wsectiontitle'>"+(options.no_minimize ? "" : "<span class='switch-section-button'></span>")+name+"</div>";
	code += "<div class='wsectioncontent'></div>";
	element.innerHTML = code;
	this.root.appendChild(element);

	if(name)
		$(element).find(".wsectiontitle").click(function(e) {
			if(e.target.localName == "button") return;
			$(element).toggleClass("minimized");
			$(element).find(".wsectioncontent").toggle();
		});

	this.current_section = element;
	this.current_section_content = $(element).find(".wsectioncontent")[0];
	this.content = this.current_section_content; //shortcut
	if(options.widgets_per_row)
		this.widgets_per_row = options.widgets_per_row;
	return element;
}

Inspector.prototype.beginGroup = function(name, options)
{
	options = options || {};

	if(this.current_group)
		this.endGroup();

	var element = document.createElement("DIV");
	element.className = "wgroup";
	element.innerHTML = "<div class='wgroupheader "+ (options.title ? "wtitle" : "") +"'><span class='wgrouptoggle'>-</span>"+name+"</div>";

	var content = document.createElement("DIV");
	content.className = "wgroupcontent";
	if(options.collapsed)
		content.style.display = "none";

	element.appendChild(content);

	var collapsed = options.collapsed || false;
	$(element).find(".wgroupheader").click(function() { 
		$(element).find(".wgroupcontent").toggle();
		collapsed = !collapsed;
		$(element).find(".wgrouptoggle").html(collapsed ? "+" : "-");
	});

	this.append(element);

	this.current_group = element;
	this.current_group_content = content;
	this.content = this.current_group_content; //shortcut

	return element;
}

Inspector.prototype.endGroup = function(options)
{
	this.current_group = null;
	this.current_group_content = null;
	this.content = this.current_section_content; //shortcut
}

Inspector.prototype.addTitle = function(title,options)
{
	options = options || {};
	var element = document.createElement("DIV");
	var code = "<span class='wtitle'><span class='text'>"+title+"</span>";
	if(options.help)
	{
		code += "<span class='help'><div class='help-content'>"+options.help+"</div></span>";
	}
	code += "</span>";
	element.innerHTML = code;

	element.setValue = function(v) { $(this).find(".text").html(v); };

	this.append(element);
	return element;
}

Inspector.prototype.addSeparator = function()
{
	var element = document.createElement("DIV");
	element.className = "separator";
	this.append(element);
	return element;
}

Inspector.prototype.addString = function(name,value, options)
{
	options = options || {};
	value = value || "";
	var that = this;
	this.values[name] = value;

	var inputtype = "text";
	if(options.password) inputtype = "password";
	
	var element = this.createWidget(name,"<span class='inputfield full "+(options.disabled?"disabled":"")+"'><input type='"+inputtype+"' tabIndex='"+this.tab_index+"' class='text string' value='"+value+"' "+(options.disabled?"disabled":"")+"/></span>", options);
	$(element).find(".wcontent input").change( function(e) { 
		Inspector.onWidgetChange.call(that,element,name,e.target.value, options);
	});
	this.tab_index += 1;

	element.setValue = function(v) { $(this).find("input").val(v).change(); };
	element.wchange = function(callback) { $(this).wchange(callback); }
	this.append(element);
	return element;
}

Inspector.prototype.addStringButton = function(name,value, options)
{
	options = options || {};
	value = value || "";
	var that = this;
	this.values[name] = value;
	
	var element = this.createWidget(name,"<span class='inputfield button'><input type='text' tabIndex='"+this.tab_index+"' class='text string' value='"+value+"' "+(options.disabled?"disabled":"")+"/></span><button class='micro'>"+(options.button || "...")+"</button>", options);

	$(element).find(".wcontent input").change( function(e) { 
		Inspector.onWidgetChange.call(that,element,name,e.target.value, options);
	});
	
	$(element).find(".wcontent button").click( function(e) { 
		if(options.callback_button)
			options.callback_button.call(element, $(element).find(".wcontent input").val() );
	});

	this.tab_index += 1;
	this.append(element);
	element.wchange = function(callback) { $(this).wchange(callback); }
	element.wclick = function(callback) { $(this).wclick(callback); }
	return element;
}

Inspector.prototype.addNumber = function(name, value, options)
{
	options = options || { step: 0.1 };
	value = value || 0;
	var that = this;
	this.values[name] = value;

	var element = this.createWidget(name,"", options);
	this.append(element);

	options.extraclass = "full";
	options.tab_index = this.tab_index;
	options.dragger_class = "full";
	this.tab_index++;

	var dragger = new LiteDragger(value, options);
	$(element).find(".wcontent").append(dragger.root);

	$(dragger).bind("start_dragging",inner_before_change);
	function inner_before_change(e)
	{
		if(options.callback_before) options.callback_before.call(element);
	}

	$(element).find("input").change( function(e) { 
		that.values[name] = e.target.value;
		//Inspector.onWidgetChange.call(that,this,name,ret, options);

		if(options.callback)
		{
			var ret = options.callback.call(element, parseFloat( e.target.value) ); 
			if( typeof(ret) == "number")
				$(this).val(ret);
		}
		$(element).trigger("wchange",e.target.value);
		if(that.onchange) that.onchange(name,e.target.value,element);
	});

	element.setValue = function(v) { $(this).find("input").val(v).change(); };

	return element;
}

Inspector.prototype.addVector2 = function(name,value, options)
{
	options = options || { step: 0.1 };
	value = value || [0,0];
	var that = this;
	this.values[name] = value;
	
	var element = this.createWidget(name,"", options);

	options.step = options.step ||0.1;
	options.dragger_class = "medium";
	options.tab_index = this.tab_index;
	this.tab_index++;

	var dragger1 = new LiteDragger(value[0], options);
	dragger1.root.style.marginLeft = 0;
	$(element).find(".wcontent").append(dragger1.root);

	options.tab_index = this.tab_index;
	this.tab_index++;

	var dragger2 = new LiteDragger(value[1], options);
	$(element).find(".wcontent").append(dragger2.root);

	$(dragger1).bind("start_dragging",inner_before_change);
	$(dragger2).bind("start_dragging",inner_before_change);

	function inner_before_change(e)
	{
		if(options.callback_before) options.callback_before();
	}

	$(element).find("input").change( function(e) { 
		//gather all three parameters
		var r = [];
		var elems = $(element).find("input");
		for(var i = 0; i < elems.length; i++)
			r.push( parseFloat( elems[i].value ) );

		that.values[name] = r;

		if(options.callback)
		{
			var new_val = options.callback.call(element,r); 
			
			if(typeof(new_val) == "object" && new_val.length >= 2)
			{
				for(var i = 0; i < elems.length; i++)
					$(elems[i]).val(new_val[i]);
				r = new_val;
			}
		}

		$(element).trigger("wchange",[r]);
		if(that.onchange) that.onchange(name,r,element);
	});

	this.append(element);
	return element;
}

Inspector.prototype.addVector3 = function(name,value, options)
{
	options = options || { step: 0.1 };
	value = value || [0,0,0];
	var that = this;
	this.values[name] = value;
	
	var element = this.createWidget(name,"", options);

	options.step = options.step || 0.1;
	options.dragger_class = "mini";
	options.tab_index = this.tab_index;
	this.tab_index++;

	var dragger1 = new LiteDragger(value[0], options );
	dragger1.root.style.marginLeft = 0;
	$(element).find(".wcontent").append(dragger1.root);

	options.tab_index = this.tab_index;
	this.tab_index++;

	var dragger2 = new LiteDragger(value[1], options );
	$(element).find(".wcontent").append(dragger2.root);

	options.tab_index = this.tab_index;
	this.tab_index++;

	var dragger3 = new LiteDragger(value[2], options );
	$(element).find(".wcontent").append(dragger3.root);

	$(dragger1).bind("start_dragging",inner_before_change);
	$(dragger2).bind("start_dragging",inner_before_change);
	$(dragger3).bind("start_dragging",inner_before_change);

	function inner_before_change(e)
	{
		if(options.callback_before) options.callback_before();
	}

	$(element).find("input").change( function(e) { 
		//gather all three parameters
		var r = [];
		var elems = $(element).find("input");
		for(var i = 0; i < elems.length; i++)
			r.push( parseFloat( elems[i].value ) );

		that.values[name] = r;

		if(options.callback)
		{
			var new_val = options.callback.call(element,r); 
			
			if(typeof(new_val) == "object" && new_val.length >= 3)
			{
				for(var i = 0; i < elems.length; i++)
					$(elems[i]).val(new_val[i]);
				r = new_val;
			}
		}

		$(element).trigger("wchange",[r]);
		if(that.onchange) that.onchange(name,r,element);
	});

	this.append(element);
	return element;
}

Inspector.prototype.addTextarea = function(name,value, options)
{
	options = options || {};
	value = value || "";
	var that = this;
	this.values[name] = value;
	;

	var element = this.createWidget(name,"<span class='inputfield textarea "+(options.disabled?"disabled":"")+"'><textarea tabIndex='"+this.tab_index+"' "+(options.disabled?"disabled":"")+">"+value+"</textarea></span>", options);
	this.tab_index++;

	$(element).find(".wcontent textarea").bind( options.inmediate ? "keyup" : "change", function(e) { 
		Inspector.onWidgetChange.call(that,element,name,e.target.value, options);
	});

	if(options.height)
		$(element).find("textarea").css({height: options.height });
	this.append(element);

	element.setValue = function(v) { $(this).find("textarea").val(v).change(); };
	return element;
}

Inspector.prototype.addInfo = function(name,value, options)
{
	options = options || {};
	value = value || "";
	var element = null;
	if(name != null)
		element = this.createWidget(name,value, options);
	else
	{
		element = document.createElement("div");
		element.className = options.className;
		element.innerHTML = "<span class='winfo'>"+value+"</span>";
	}

	element.setValue = function(v) { $(this).find(".winfo").html(v); };

	if(options.height)
	{
		var content = $(element).find("span.info_content")[0];
		content.style.height = typeof(options.height) == "string" ? options.height : options.height + "px";
		content.style.overflow = "auto";
	}


	this.append(element);
	return element;
}

Inspector.prototype.addSlider = function(name, value, options)
{
	options = options || {};
	options.min = options.min || 0;
	options.max = options.max || 1;
	options.step = options.step || 0.01;

	var that = this;
	this.values[name] = value;
	
	//var element = this.createWidget(name,"<span class='inputfield'><input tabIndex='"+this.tab_index+"' type='text' class='fixed nano' value='"+value+"' /></span><div class='wslider'></div>", options);
	var element = this.createWidget(name,"<span class='inputfield'>\
				<input tabIndex='"+this.tab_index+"' type='text' class='slider-text fixed nano' value='"+value+"' /></span>\
				<span class='ui-slider'>\
				<input class='slider-input' type='range' step='"+options.step+"' min='"+ options.min +"' max='"+ options.max +"'/><span class='slider-thumb'></span></span>", options);

	this.tab_index++;
	var ui = $(element).find(".ui-slider");

	$(element).find(".slider-input").bind('input', inner_slider_move );

	$(element).find(".slider-text").bind('change', function() {
		var v = parseFloat( $(this).val() );
		$(element).find(".slider-input").val(v);
		var vnormalized = (v - options.min) / (options.max - options.min);
		$(element).find(".slider-thumb").css({left: (vnormalized * ($(ui).width() - 12)) });
		Inspector.onWidgetChange.call(that,element,name,v, options);
	});

	function inner_slider_move(e)
	{
		var v = parseFloat( e.target.value );
		var vnormalized = (v - options.min) / (options.max - options.min);
		$(element).find(".slider-text").val(v);
		//$(element).find(".slider-thumb").css({left: (vnormalized * ($(ui).width() - 12)) });
		$(element).find(".slider-thumb").css({left: (vnormalized * 90).toFixed(2) + "%" });
		Inspector.onWidgetChange.call(that,element,name,v, options);
	}

	/*
	$(element).find(".wslider").slider({min: options.min, max: options.max, value: value, step: options.step });
	$(element).find(".ui-slider").bind('slide', function(e,ui) {
		var v = ui.value;
		$(element).find("input").val(v);
		Inspector.onWidgetChange.call(that,element,name,v, options);
	});
	$(element).find("input").bind('change', function() {
		var v = parseFloat( $(this).val() );
		$(element).find(".ui-slider").slider("value",v);
		Inspector.onWidgetChange.call(that,element,name,v, options);
	});
	*/

	this.append(element);
	element.setValue = function(v) { $(this).find(".slider-text").val(v); };
	$(element).find(".slider-input").val(value).trigger("input");
	return element;
}


Inspector.prototype.addCheckbox = function(name, value, options)
{
	options = options || {};
	value = value || "";
	var that = this;
	this.values[name] = value;
	
	//var element = this.createWidget(name,"<span class='inputfield'><span class='fixed flag'>"+(value ? "on" : "off")+"</span><span tabIndex='"+this.tab_index+"'class='checkbox "+(value?"on":"")+"'></span></span>", options );
	var element = this.createWidget(name,"<span class='inputfield'><span tabIndex='"+this.tab_index+"' class='fixed flag checkbox "+(value ? "on" : "off")+"'>"+(value ? "on" : "off")+"</span></span>", options );
	this.tab_index++;

	$(element).find(".wcontent .checkbox").keypress( function(e) { 
		if(e.keyCode == 32)
			$(this).click();
	});

	$(element).click( function() {
		var v = !this.data;
		this.data = v;
		$(element).find("span.flag").html(v ? "on" : "off");
		if(v)
			$(element).find("span.checkbox").addClass("on");
		else
			$(element).find("span.checkbox").removeClass("on");
		Inspector.onWidgetChange.call(that,element,name,v, options);
	})[0].data = value;

	element.setValue = function(v) { 
		if(	that.values[name] != v)
			$(this).find(".checkbox").click(); 
		};

	this.append(element);
	return element;
}

Inspector.prototype.addFlags = function(flags, force_flags)
{
	var f = {};
	for(var i in flags)
		f[i] = flags[i];
	if(force_flags)
		for(var i in force_flags)
			if( typeof(f[i]) == "undefined" )
				f[i] = ( force_flags[i] ? true : false );

	for(var i in f)
	{
		this.addCheckbox(i, f[i], { callback: (function(j) {
			return function(v) { 
				flags[j] = v;
			}
		})(i)
		});
	}
}

Inspector.prototype.addCombo = function(name, value, options)
{
	options = options || {};
	//value = value || "";
	var that = this;
	this.values[name] = value;
	
	var code = "<select tabIndex='"+this.tab_index+"' "+(options.disabled?"disabled":"")+" class='"+(options.disabled?"disabled":"")+"'>";
	this.tab_index++;

	if(options.values)
	{
		for(var i in options.values)
			code += "<option "+(options.values[i] == value?" selected":"")+">" + (options.values.length ? options.values[i] : i) + "</option>";
	}
	code += "</select>";

	var element = this.createWidget(name,"<span class='inputfield full inputcombo "+(options.disabled?"disabled":"")+"'>"+code+"</span>", options);
	$(element).find(".wcontent select").change( function(e) { 
		var value = e.target.value;
		if(options.values && options.values.constructor != Array)
			value = options.values[value];
		Inspector.onWidgetChange.call(that,element,name,value, options);
	});

	this.append(element);
	return element;
}

Inspector.prototype.addComboButtons = function(name, value, options)
{
	options = options || {};
	value = value || "";
	var that = this;
	this.values[name] = value;
	
	var code = "";
	if(options.values)
		for(var i in options.values)
			code += "<button class='wcombobutton "+(value == options.values[i] ? "selected":"")+"' data-name='options.values[i]'>" + options.values[i] + "</button>";

	var element = this.createWidget(name,code, options);
	$(element).find(".wcontent button").click( function(e) { 

		var buttonname = e.target.innerHTML;
		that.values[name] = buttonname;

		$(element).find(".selected").removeClass("selected");
		$(this).addClass("selected");

		Inspector.onWidgetChange.call(that,element,name,buttonname, options);
	});

	this.append(element);
	return element;
}

Inspector.prototype.addTags = function(name, value, options)
{
	options = options || {};
	value = value || [];
	var that = this;
	this.values[name] = value;
	
	var code = "<select>";
	if(options.values)
		for(var i in options.values)
			code += "<option>" + options.values[i] + "</option>";

	code += "</select><div class='wtagscontainer inputfield'></div>";

	var element = this.createWidget(name,"<span class='inputfield full'>"+code+"</span>", options);
	element.tags = {};

	//add default tags
	for(var i in options.value)
		inner_addtag(options.value[i]);

	//combo change
	$(element).find(".wcontent select").change( function(e) { 
		inner_addtag(e.target.value);
	});

	function inner_addtag(tagname)
	{
		if( element.tags[tagname] )
			return; //repeated tags no

		element.tags[tagname] = true;

		var tag = document.createElement("div");
		tag.data = tagname;
		tag.className = "wtag";
		tag.innerHTML = tagname+"<span class='close'>X</span>";

		$(tag).find(".close").click(function(e) {
			var tagname = $(this).parent()[0].data;
			delete element.tags[tagname];
			$(this).parent().remove();
			$(element).trigger("wremoved", tagname );
			Inspector.onWidgetChange.call(that,element,name,element.tags, options);
		});

		$(element).find(".wtagscontainer").append(tag);

		that.values[name] = element.tags;
		if(options.callback) options.callback.call(element,element.tags); 
		$(element).trigger("wchange",element.tags);
		$(element).trigger("wadded",tagname);
		if(that.onchange) that.onchange(name, element.tags, element);
	}

	this.append(element);
	return element;
}

Inspector.prototype.addList = function(name, values, options)
{
	options = options || {};
	var that = this;
	
	var height = "";
	if(options.height)
		height = "style='height: "+options.height+"px; overflow: auto;'";

	var code = "<ul class='lite-list' "+height+" tabIndex='"+this.tab_index+"'><ul>";
	this.tab_index++;

	var element = this.createWidget(name,"<span class='inputfield full "+(options.disabled?"disabled":"")+"'>"+code+"</span>", options);

	$(element).find("ul").focus(function() {
		//trace("focus!");
		$(document).bind("keypress",inner_key);
	});

	$(element).find("ul").blur(function() {
		//trace("blur!");
		$(document).unbind("keypress",inner_key);
	});

	function inner_key(e)
	{
		//trace(e);
		var selected = $(element).find("li.selected");
		if(!selected || !selected.length) return;

		if(e.keyCode == 40)
		{
			var next = selected.next();
			if(next && next.length)
				$(next[0]).click();
		}
		else if(e.keyCode == 38)
		{
			var prev = selected.prev();
			if(prev && prev.length)
				$(prev[0]).click();
		}
	}

	function inner_item_click(e) { 

		if(options.multiselection)
			$(this).toggleClass("selected");
		else
		{
			$(element).find("li").removeClass("selected");
			$(this).addClass("selected");
		}

		var value = values[ this.dataset["pos"] ];
		//if(options.callback) options.callback.call(element,value); //done in onWidgetChange
		Inspector.onWidgetChange.call(that,element,name,value, options);
		$(element).trigger("wadded",value);
	}

	element.updateItems = function(new_values)
	{
		var code = "";
		values = new_values;
		if(values)
			for(var i in values)
			{
				var item_name = values[i]; //array

				var icon = "";
				if(	values[i].length == null ) //object
				{
					item_name = values[i].name ? values[i].name : i;
					if(values[i].icon)
						icon = "<img src='"+values[i].icon+"' class='icon' />";
				}

				code += "<li className='item-"+i+" "+(typeof(values[i]) == "object" && values[i].selected ? "selected":"") + "' data-name='"+item_name+"' data-pos='"+i+"'>" + icon + item_name + "</li>";
			}

		$(this).find("ul").html(code);
		$(this).find(".wcontent li").click( inner_item_click );
	}

	element.removeItem = function(name)
	{
		var items = $(element).find(".wcontent li");
		for(var i = 0; i < items.length; i++)
		{
			if(items[i].dataset["name"] == name)
				$(items[i]).remove();
		}
	}

	element.updateItems(values);
	this.append(element);

	if(options.height) $(element).scroll(0);
	return element;
}

Inspector.prototype.addButton = function(name, value, options)
{
	options = options || {};
	value = value || "";
	var that = this;
	
	var element = this.createWidget(name,"<button tabIndex='"+ this.tab_index + "'>"+value+"</button>", options);
	this.tab_index++;
	$(element).find("button").click(function() {
		Inspector.onWidgetChange.call(that,element,name,this.innerHTML, options);
		$(element).trigger("wclick",value);
	});
	this.append(element);
	element.wclick = function(callback) { $(this).wclick(callback); }
	return element;
}

Inspector.prototype.addButtons = function(name, value, options)
{
	options = options || {};
	value = value || "";
	var that = this;

	var code = "";
	var w = "calc("+(100/value.length).toFixed(3)+"% - "+Math.floor(16/value.length)+"px);";
	if(value && typeof(value) == "object")
	{
		for(var i in value)
		{
			code += "<button tabIndex='"+this.tab_index+"' style=' width:"+w+" width: -moz-"+w+" width: -webkit-calc("+(89/value.length).toFixed(3)+"%)'>"+value[i]+"</button>";
			this.tab_index++;
		}
	}
	var element = this.createWidget(name,code, options);
	$(element).find("button").click(function() {
		Inspector.onWidgetChange.call(that,element,name,this.innerHTML, options);
		$(element).trigger("wclick",this.innerHTML);
	});
	this.append(element);
	return element;
}

Inspector.prototype.addColor = function(name,value,options)
{
	options = options || {};
	value = value || [0.0,0.0,0.0];
	var that = this;
	this.values[name] = value;
	
	var code = "<input tabIndex='"+this.tab_index+"' id='colorpicker-"+name+"' class='color' value='"+value+"' "+(options.disabled?"disabled":"")+"/>";
	this.tab_index++;

	if(options.show_rgb)
		code += "<span class='rgb-color'>"+Inspector.parseColor(value)+"</span>";
	var element = this.createWidget(name,code, options);
	this.append(element); //add now or jscolor dont work

	//create jsColor 
	var input_element = $(element).find("input.color")[0];
	var myColor = new jscolor.color(input_element);
	myColor.pickerFaceColor = "#333";
	myColor.pickerBorderColor = "black";
	myColor.pickerInsetColor = "#222";
	myColor.rgb_intensity = 1.0;

	if(options.disabled) myColor.pickerOnfocus = false; //this doesnt work

	if(typeof(value) != "string" && value.length && value.length > 2)
	{
		var intensity = 1.0;
		myColor.fromRGB(value[0]*intensity,value[1]*intensity,value[2]*intensity);
		myColor.rgb_intensity = intensity;
	}

	//update values in rgb format
	$(input_element).change( function(e) { 
		$(element).find(".rgb-color").html( Inspector.parseColor(myColor.rgb) );
	});

	myColor.onImmediateChange = function() 
	{
		var v = [ myColor.rgb[0] * myColor.rgb_intensity, myColor.rgb[1] * myColor.rgb_intensity, myColor.rgb[2] * myColor.rgb_intensity ];
		//Inspector.onWidgetChange.call(that,element,name,v, options);

		that.values[name] = v;
		if(options.callback)
			options.callback.call(element, v.concat(), "#" + myColor.toString(), myColor);
		$(element).trigger("wchange",[v.concat(), myColor.toString()]);
		if(that.onchange) that.onchange(name, v.concat(), element);
	}

	//alpha dragger
	options.step = options.step || 0.01;
	options.dragger_class = "nano";

	var dragger = new LiteDragger(1, options);
	$(element).find('.wcontent').append(dragger.root);
	$(dragger.input).change(function()
	{
		var v = parseFloat($(this).val());
		myColor.rgb_intensity = v;
		if (myColor.onImmediateChange)
			myColor.onImmediateChange();
	});

	return element;
}

Inspector.prototype.addFile = function(name, value, options)
{
	options = options || {};
	value = value || "";
	var that = this;
	this.values[name] = value;
	
	var element = this.createWidget(name,"<span class='inputfield full whidden'><span class='filename'>"+value+"</span><input type='file' size='100' class='file' value='"+value+"'/></span>", options);
	$(element).find(".wcontent input").change( function(e) { 
		if(options.callback) options.callback.call(element,e.target.value);
		$(element).find(".filename").html( e.target.value );
		$(element).trigger("wchange",[e.target.files]);
		Inspector.onWidgetChange.call(that,element,name,e.target.value, options);
	});
	this.append(element);
	return element;
}

Inspector.prototype.addLine = function(name, value, options)
{
	options = options || {};
	value = value || "";
	var that = this;
	this.values[name] = value;
	
	var element = this.createWidget(name,"<span class='line-editor'></span>", options);

	var line_editor = new LiteLineEditor(value,options);
	$(element).find("span.line-editor").append(line_editor);

	$(line_editor).change( function(e) { 
		if(options.callback) options.callback.call(element,e.target.value);
		$(element).trigger("wchange",[e.target.value]);
		Inspector.onWidgetChange.call(that,element,name,e.target.value, options);
	});

	this.append(element);
	return element;
}

Inspector.prototype.addTree = function(name, value, options)
{
	options = options || {};
	value = value || "";
	var element = this.createWidget(name,"<div class='wtree'></div>", options);
	
	var node = $(element).find(".wtree")[0];
	var current = value;

	inner_recursive(node,value);

	function inner_recursive(root_node, value)
	{
		for(var i in value)
		{
			var e = document.createElement("div");
			e.className = "treenode";
			if( typeof( value[i] ) == "object" )
			{
				e.innerHTML = "<span class='itemname'>" + i + "</span><span class='itemcontent'></span>";
				inner_recursive($(e).find(".itemcontent")[0], value[i] );
			}
			else
				e.innerHTML = "<span class='itemname'>" + i + "</span><span class='itemvalue'>" + value[i] + "</span>";
			root_node.appendChild(e);
		}
	}

	this.append(element);
	return element;
}


/*
Inspector.prototype.addImageSlot = function(title, callback_drop, callback_set)
{
	var element = this.createElement("DIV");
	element.innerHTML = "<strong>"+title+"</strong><input class='text' type='text' value=''/><button class='load confirm_button'>Ok</button><div class='img-slot'>Drop img here</div>";
	this.append(element);

	var confirm_button = $(element).find(".confirm_button")[0];
	$(confirm_button).click(function() {
		var text = $(element).find(".text")[0];
		if(callback_set)
			callback_set( $(text).val() );
	});

	var slot = $(element).find(".img-slot")[0];

	slot.addEventListener("dragenter", onDragEnter, false);
	slot.addEventListener("dragexit", onDragExit, false);
	slot.addEventListener("dragover", onDragNull, false);
	slot.addEventListener("drop", onFileDrop, false);


	function onDragEnter(evt)
	{
		$(slot).addClass("highlight");
		evt.stopPropagation();
		evt.preventDefault();
	}

	function onDragExit(evt)
	{
		$(slot).removeClass("highlight");
		evt.stopPropagation();
		evt.preventDefault();
	}

	function onDragNull(evt)
	{
		evt.stopPropagation();
		evt.preventDefault();
	}

	function onFileDrop(evt)
	{
		trace("processing drag and drop...");
		$(slot).removeClass("highlight");
		evt.stopPropagation();
		evt.preventDefault();

		var files = evt.dataTransfer.files;
		var count = files.length;
		
		var file = files[0];
		if(file == null) return;

		var reader = new FileReader();
		var extension = file.name.substr( file.name.lastIndexOf(".") + 1).toLowerCase();

		reader.onload = function(e) {
			if(callback_drop)
				callback_drop(e, file);
		}

		var image_extensions = ["png","jpg"];
		if (image_extensions.indexOf(extension) != -1)
			reader.readAsDataURL(file);
		else
			reader.readAsArrayBuffer(file);
	}
}
*/



Inspector.parseColor = function(color)
{
	return "<span style='color: #FAA'>" + color[0].toFixed(2) + "</span>,<span style='color: #AFA'>" + color[1].toFixed(2) + "</span>,<span style='color: #AAF'>" + color[2].toFixed(2) + "</span>";
}

/***** DRAGGER **********/

function LiteDragger(value, options)
{
	options = options || {};
	var element = document.createElement("div");
	element.className = "dragger " + (options.extraclass ? options.extraclass : "");

	var wrap = document.createElement("span");
	wrap.className = "inputfield " + (options.extraclass ? options.extraclass : "");
	if(options.disabled)
	wrap.className += " disabled";
	element.appendChild(wrap);

	var dragger_class = options.dragger_class || "full";

	var input = document.createElement("input");
	input.className = "text number " + (dragger_class ? dragger_class : "");
	input.value = value + (options.units ? options.units : "");
	input.tabIndex = options.tab_index;
	this.input = input;

	$(input).bind("keydown",function(e) {
		//trace(e.keyCode);
		if(e.keyCode == 38)
			inner_inc(1,e);
		else if(e.keyCode == 40)
			inner_inc(-1,e);
		else
			return;
		e.stopPropagation();
		e.preventDefault();
		return true;
	});


	if(options.disabled)
		input.disabled = true;
	if(options.tab_index)
		input.tabIndex = options.tab_index;
	wrap.appendChild(input);
	element.input = input;

	var dragger = document.createElement("div");
	dragger.className = "drag_widget";
	if(options.disabled)
		dragger.className += " disabled";

	wrap.appendChild(dragger);
	element.dragger = dragger;

	this.root = element;

	$(dragger).bind("mousedown",inner_down);

	function inner_down(e)
	{
		if(!options.disabled)
		{
			$(document).bind("mousemove", inner_move);
			$(document).bind("mouseup", inner_up);

			dragger.data = [e.screenX, e.screenY];

			$(dragger).trigger("start_dragging");
		}

		e.stopPropagation();
		e.preventDefault();
	}

	function inner_move(e)
	{
		var diff = [e.screenX - dragger.data[0], dragger.data[1] - e.screenY];

		dragger.data = [e.screenX, e.screenY];
		var axis = options.horizontal ? 0 : 1;
		inner_inc(diff[axis],e);

		e.stopPropagation();
		e.preventDefault();
		return false;
	};

	function inner_up(e)
	{
		$(dragger).trigger("stop_dragging");
		$(document).unbind("mousemove", inner_move);
		$(document).unbind("mouseup", inner_up);
		$(dragger).trigger("blur");
		e.stopPropagation();
		e.preventDefault();
		return false;
	};

	function inner_inc(v,e)
	{
		var scale = (options.step ? options.step : 1.0);
		if(e && e.shiftKey)
			scale *= 10;
		else if(e && e.ctrlKey)
			scale *= 0.1;
		var value = parseFloat( input.value ) + v * scale;
		if(options.max != null && value > options.max)
			value = options.max;
		if(options.min != null && value < options.min)
			value = options.min;

		if(options.precision)
			input.value = value.toFixed(options.precision);
		else
			input.value = ((value * 1000)<<0) / 1000; //remove ugly decimals
		if(options.units)
			input.value += options.units;
		$(input).change();
	}
}

function LiteLineEditor(value, options)
{
	options = options || {};
	var element = document.createElement("div");
	element.className = "curve " + (options.extraclass ? options.extraclass : "");
	element.style.minHeight = "50px";
	element.style.width = options.width || "100%";

	element.bgcolor = options.bgcolor || "#222";
	element.pointscolor = options.pointscolor || "#5AF";
	element.linecolor = options.linecolor || "#444";

	element.value = value || [];
	element.xrange = options.xrange || [0,1]; //min,max
	element.yrange = options.yrange || [0,1]; //min,max
	element.defaulty = options.defaulty != null ? options.defaulty : 0.5;
	element.no_trespassing = options.no_trespassing || false;
	element.show_samples = options.show_samples || 0;
	element.options = options;

	var canvas = document.createElement("canvas");
	canvas.width = options.width || 200;
	canvas.height = options.height || 50;
	element.appendChild(canvas);
	element.canvas = canvas;

	$(canvas).bind("mousedown",onmousedown);
	$(element).resize(onresize);

	element.getValueAt = function(x)
	{
		if(x < element.xrange[0] || x > element.xrange[1])
			return element.defaulty;

		var last = [ element.xrange[0], element.defaulty ];
		var f = 0;
		for(var i = 0; i < element.value.length; i += 1)
		{
			var v = element.value[i];
			if(x == v[0]) return v[1];
			if(x < v[0])
			{
				f = (x - last[0]) / (v[0] - last[0]);
				return last[1] * (1-f) + v[1] * f;
			}
			last = v;
		}

		v = [ element.xrange[1], element.defaulty ];
		f = (x - last[0]) / (v[0] - last[0]);
		return last[1] * (1-f) + v[1] * f;
	}

	element.resample = function(samples)
	{
		var r = [];
		var dx = (element.xrange[1] - element.xrange[0]) / samples;
		for(var i = element.xrange[0]; i <= element.xrange[1]; i += dx)
		{
			r.push( element.getValueAt(i) );
		}
		return r;
	}

	element.addValue = function(v)
	{
		for(var i = 0; i < element.value; i++)
		{
			var value = element.value[i];
			if(value[0] < v[0]) continue;
			element.value.splice(i,0,v);
			redraw();
			return;
		}

		element.value.push(v);
		redraw();
	}

	//value to canvas
	function convert(v)
	{
		return [ canvas.width * ( (element.xrange[1] - element.xrange[0]) * v[0] + element.xrange[0]),
			canvas.height * ((element.yrange[1] - element.yrange[0]) * v[1] + element.yrange[0])];
	}

	//canvas to value
	function unconvert(v)
	{
		return [(v[0] / canvas.width - element.xrange[0]) / (element.xrange[1] - element.xrange[0]),
				(v[1] / canvas.height - element.yrange[0]) / (element.yrange[1] - element.yrange[0])];
	}

	var selected = -1;

	element.redraw = function()
	{
		var ctx = canvas.getContext("2d");
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.translate(0,canvas.height);
		ctx.scale(1,-1);

		ctx.fillStyle = element.bgcolor;
		ctx.fillRect(0,0,canvas.width,canvas.height);

		ctx.strokeStyle = element.linecolor;
		ctx.beginPath();

		//draw line
		var pos = convert([element.xrange[0],element.defaulty]);
		ctx.moveTo( pos[0], pos[1] );

		for(var i in element.value)
		{
			var value = element.value[i];
			pos = convert(value);
			ctx.lineTo( pos[0], pos[1] );
		}

		pos = convert([element.xrange[1],element.defaulty]);
		ctx.lineTo( pos[0], pos[1] );
		ctx.stroke();

		//draw points
		for(var i = 0; i < element.value.length; i += 1)
		{
			var value = element.value[i];
			pos = convert(value);
			if(selected == i)
				ctx.fillStyle = "white";
			else
				ctx.fillStyle = element.pointscolor;
			ctx.beginPath();
			ctx.arc( pos[0], pos[1], selected == i ? 4 : 2, 0, Math.PI * 2);
			ctx.fill();
		}

		if(element.show_samples)
		{
			var samples = element.resample(element.show_samples);
			ctx.fillStyle = "#888";
			for(var i = 0; i < samples.length; i += 1)
			{
				var value = [ i * ((element.xrange[1] - element.xrange[0]) / element.show_samples) + element.xrange[0], samples[i] ];
				pos = convert(value);
				ctx.beginPath();
				ctx.arc( pos[0], pos[1], 2, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}

	var last_mouse = [0,0];
	function onmousedown(evt)
	{
		$(document).bind("mousemove",onmousemove);
		$(document).bind("mouseup",onmouseup);

        var rect = canvas.getBoundingClientRect();
        var mousex = evt.clientX - rect.left;
        var mousey = evt.clientY - rect.top;

		selected = computeSelected(mousex,canvas.height-mousey);

		if(selected == -1)
		{
			var v = unconvert([mousex,canvas.height-mousey]);
			element.value.push(v);
			sortValues();
			selected = element.value.indexOf(v);
		}

		last_mouse = [mousex,mousey];
		element.redraw();
		evt.preventDefault();
		evt.stopPropagation();
	}

	function onmousemove(evt)
	{
        var rect = canvas.getBoundingClientRect();
        var mousex = evt.clientX - rect.left;
        var mousey = evt.clientY - rect.top;

		if(mousex < 0) mousex = 0;
		else if(mousex > canvas.width) mousex = canvas.width;
		if(mousey < 0) mousey = 0;
		else if(mousey > canvas.height) mousey = canvas.height;

		//dragging to remove
		if( selected != -1 && distance( [evt.clientX - rect.left, evt.clientY - rect.top], [mousex,mousey] ) > canvas.height * 0.5 )
		{
			element.value.splice(selected,1);
			onmouseup(evt);
			return;
		}

		var dx = last_mouse[0] - mousex;
		var dy = last_mouse[1] - mousey;
		var delta = unconvert([-dx,dy]);
		if(selected != -1)
		{
			var minx = element.xrange[0];
			var maxx = element.xrange[1];

			if(element.no_trespassing)
			{
				if(selected > 0) minx = element.value[selected-1][0];
				if(selected < (element.value.length-1) ) maxx = element.value[selected+1][0];
			}

			var v = element.value[selected];
			v[0] += delta[0];
			v[1] += delta[1];
			if(v[0] < minx) v[0] = minx;
			else if(v[0] > maxx) v[0] = maxx;
			if(v[1] < element.yrange[0]) v[1] = element.yrange[0];
			else if(v[1] > element.yrange[1]) v[1] = element.yrange[1];
		}

		sortValues();
		element.redraw();
		last_mouse[0] = mousex;
		last_mouse[1] = mousey;
		onchange();

		evt.preventDefault();
		evt.stopPropagation();
	}

	function onmouseup(evt)
	{
		selected = -1;
		element.redraw();
		$(document).unbind("mousemove",onmousemove);
		$(document).unbind("mouseup",onmouseup);
		onchange();
		evt.preventDefault();
		evt.stopPropagation();
	}

	function onresize(e)
	{
		canvas.width = $(this).width();
		canvas.height = $(this).height();
		element.redraw();
	}
	
	function onchange()
	{
		if(options.callback)
			options.callback.call(element,element.value);
		else
			$(element).change();
	}

	function distance(a,b) { return Math.sqrt( Math.pow(b[0]-a[0],2) + Math.pow(b[1]-a[1],2) ); };

	function computeSelected(x,y)
	{
		var min_dist = 100000;
		var max_dist = 8; //pixels
		var selected = -1;
		for(var i=0; i < element.value.length; i++)
		{
			var value = element.value[i];
			var pos = convert(value);
			var dist = distance([x,y],pos);
			if(dist < min_dist && dist < max_dist)
			{
				min_dist = dist;
				selected = i;
			}
		}
		return selected;
	}

	function sortValues()
	{
		var v = null;
		if(selected != -1)
			v = element.value[selected];
		element.value.sort(function(a,b) { return a[0] > b[0]; });
		if(v)
			selected = element.value.indexOf(v);
	}
	
	element.redraw();
	return element;
}


LiteGUI.Inspector = Inspector;