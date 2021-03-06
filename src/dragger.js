(function(){

	/***** DRAGGER **********/
	function Dragger(value, options)
	{
		if(value === null || value === undefined)
			value = 0;
		else if(value.constructor === String)
			value = parseFloat(value);
		else if(value.constructor !== Number)
			value = 0;

		this.value = value;
		var that = this;
		var precision = options.precision != undefined ? options.precision : 3; //num decimals

		this.options = options = options || {};
		var element = document.createElement("div");
		element.className = "dragger " + (options.extraclass ? options.extraclass : "");
		this.root = element;

		var wrap = document.createElement("span");
		wrap.className = "inputfield " + (options.extraclass ? options.extraclass : "") + (options.full ? " full" : "");
		if(options.disabled)
		wrap.className += " disabled";
		element.appendChild(wrap);

		var dragger_class = options.dragger_class || "full";

		var input = document.createElement("input");
		input.className = "text number " + (dragger_class ? dragger_class : "");
		input.value = value.toFixed( precision ) + (options.units ? options.units : "");
		input.tabIndex = options.tab_index;
		this.input = input;
		element.input = input;

		if(options.disabled)
			input.disabled = true;
		if(options.tab_index)
			input.tabIndex = options.tab_index;
		wrap.appendChild(input);

		input.addEventListener("keydown",function(e) {
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

		var dragger = document.createElement("div");
		dragger.className = "drag_widget";
		if(options.disabled)
			dragger.className += " disabled";

		wrap.appendChild(dragger);
		element.dragger = dragger;

		dragger.addEventListener("mousedown",inner_down);

		function inner_down(e)
		{
			document.removeEventListener("mousemove", inner_move);
			document.removeEventListener("mouseup", inner_up);

			if(!options.disabled)
			{
				document.addEventListener("mousemove", inner_move);
				document.addEventListener("mouseup", inner_up);

				dragger.data = [e.screenX, e.screenY];

				LiteGUI.trigger( element,"start_dragging");
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
			LiteGUI.trigger(element, "stop_dragging");
			document.removeEventListener("mousemove", inner_move);
			document.removeEventListener("mouseup", inner_up);
			LiteGUI.trigger(dragger,"blur");
			e.stopPropagation();
			e.preventDefault();
			return false;
		};

		function inner_inc(v,e)
		{
			if(!options.linear)
				v = v > 0 ? Math.pow(v,1.2) : Math.pow( Math.abs(v), 1.2) * -1;
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

			input.value = value.toFixed( precision );
			//input.value = ((value * 1000)<<0) / 1000; //remove ugly decimals
			if(options.units)
				input.value += options.units;
			LiteGUI.trigger(input,"change");
		}
	}

	Dragger.prototype.setValue = function(v, skip_event) { 
		v = parseFloat(v);
		this.value = v;
		if(this.options.precision)
			v = v.toFixed(this.options.precision);
		if(this.options.units)
			v += this.options.units;
		this.input.value = v;
		if(!skip_event)
			LiteGUI.trigger( this.input, "change" );
	}

	Dragger.prototype.getValue = function()
	{
		return this.value;
	}

	LiteGUI.Dragger = Dragger;

})();