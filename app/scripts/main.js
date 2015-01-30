$(function() {
	var element_types = ["general", "action", "character", "dialogue",
											 "parenthetical", "scene-heading", "transition",
											 "shot"];
	var active_element_type = 0; // action
	var last_character_name = "";
	var page_max_inner_height = $("meta.maximum-inner-height").height();
	var script_title = "Untitled Script";

	$("div.page").focus();

	// every keyup in the editor
	$("div.page").keydown(function(e) {
		// establish what element we're in
		var $dom_element = $(document.getSelection().anchorNode.parentNode);
		var element_type = $dom_element.attr("class");

		// override default tab behaviour
		if(e.which == 9) {
			e.preventDefault();

			// if the element we're on is blank, do the switcheroo!
			if($dom_element.text().trim() == "") {
				switchElementType(e.shiftKey); // if shift is down then we go backwards
			} else {
				console.log("not switching element type", $dom_element.text().trim());
				console.log($dom_element);
			}
		}

		// override default enter key behaviour
		if (e.which == 13) {
			e.preventDefault();

			var new_element_type = "action"; // the default

			// vary the new element based on what element we're currently in
			if(element_type == "character") {
				new_element_type = "dialogue";
				last_character_name = $dom_element.text();

				// if the next element in the dom is already a dialogue, just jump
				// into that dialogue element rather than creating a new element
				if($dom_element.next().hasClass("dialogue")) {
					focusOnElement($dom_element.next());
					return false;
				}
			}

			if($dom_element.text().trim() != "") {
				createNewElement(new_element_type);
			}

			// todo: ghost autocomplete selection
		}
	});

	$("div.page").keyup(function(e) {
		// establish what element we're in
		var $dom_element = $(document.getSelection().anchorNode.parentNode);
		var element_type = $dom_element.attr("class");

		/// GENERAL ///

		// override default backspace key behaviour
		if (e.which == 8) {
			cleanupOrphanSpans();
			checkElementsExist();
		}

		if (element_type == "scene-heading") {
			/// SCENE HEADING ///
		} else if (element_type == "character") {
			/// CHARACTER ///
		} else if (element_type == "dialogue") {
			/// DIALOGUE ///
		} else if (element_type == "action") {
			/// ACTION ///
		} else {
			// possibly a fuckup
		}

		console.log(e.which);

	});

	$('div.page').change(function() {
		// every time the page changes, check we're not over
		// the inner height limit. if we are then we have to
		// move as much as possible to the next page.

		if(checkPageInnerHeight(this)) {

		}
	});


	// general functions
	function cleanupOrphanSpans() {
		// sometimes when you delete an element we end up with dodgy
		// spans appearing out of nowhere, ruining the formatting.
		//
		// this tidies them up a bit.
		$("div.page span").each(function(index, span) {
			var innerText = $(span).text();
			console.log(span);
			$(span).replaceWith(innerText);
		});
	}

	function focusOnElement($element) {
		// this is really dodgy to be honest.
		// force focus on element by switching contenteditable about
		//
		// this is the only way i could find to force the focus on to
		// another element within a contenteditable. maybe there's
		// a way to actually move the caret?

		$("div.page").removeAttr("contenteditable");
		$element.attr("contenteditable", "").focus();

		// TODO:  move the caret to the end of the element

		setTimeout(function() {
			$("div.page").attr("contenteditable", "").focus();
			$element.removeAttr("contenteditable");
		}, 50);
	}

	function switchElementType(reverse) {
		// TODO: consolidate these $dom_element lines into a function?
		var $dom_element = $(document.getSelection().anchorNode.parentNode);

		// FIXME: element chooser fades out too quickly if you hold tab down and
		//				cycle rapidly

		$("div.hud .element-chooser").stop(true, true).show();

		if(reverse) {
			var step = -1;
		} else {
			var step = 1;
		}

		active_element_type = (active_element_type + step) % element_types.length;

		$("div.hud .element-chooser li").removeClass("highlight");
		$("div.hud .element-chooser li:eq(" + active_element_type + ")").addClass("highlight");

		$("div.hud .element-chooser").delay(1000).fadeOut(2000);

		$dom_element.attr("class", element_types[active_element_type]);
		console.log(element_types[active_element_type]);

		// special case ghosting etc
		var new_ghost_text = "";
		if(element_types[active_element_type] == "character") {
			new_ghost_text = "Captain Peters";
		} else if (element_types[active_element_type] == "scene-heading") {
			new_ghost_text = "INT. Bridge - Day";
		}

		$dom_element.attr("data-ghost-text", new_ghost_text);
	}

	function checkElementsExist() {
		// make sure the user is typing into an element... if not
		// then we need to make a new element

		var $dom_element = $(document.getSelection().anchorNode.parentNode);

		if($dom_element.hasClass("pages")) {
			// christ! it's fucked up! create a new action element...
			createNewElement("action");
			console.log("creating emergency action element...");
		}
	}

	function createNewElement(new_element_type) {
		// create a new element of the specified type & punt it into
		// the page

		if(!new_element_type) {
			new_element_type = "action";
		}

		var $dom_element = $(document.getSelection().anchorNode.parentNode);

		// create the new element
		$new_element = $(document.createElement("p"));

		// pop it into the dom
		$('div.page').append($new_element);

		// todo - switch back to last used character from dialogue

		// set the element class
		$new_element.addClass(new_element_type);

		// ... and add a nbsp so it works ...
		$new_element.html('&nbsp;');

		// wahay!
		focusOnElement($new_element);

		return $new_element;
	}

	function checkPageInnerHeight($page) {
		// checks the innerheight of a page to see
		// if it's over the acceptable limit.
		//
		// if it is, then a pagebreak is needed & we return the element
		// that needs chopped
		var inner_height = 0;

		$('.page p').each(function(i,element) {
			inner_height += $(element).outerHeight(true);
		//	element_offsets[i] = $(element).position().top;
		});

		if(inner_height > page_max_inner_height) {

		}
	}

	function saveScript() {
		// save the screenplay down to a json-formatted file
		// returns a data url to shove in a link

		var template = {
			meta: {
				title: ""
			},
			pages: []
		};

		// set the title
		template.meta.title = script_title;

		// go through every page
		$(".page").each(function(page_index, page) {
			template.pages[page_index] = []

			$(page).find('p').each(function(index, element) {
				template.pages[page_index][index] = {
					element_type: $(element).attr('class'),
					text: $(element).text()
				}
			});
		});

		var blob = new Blob([JSON.stringify(template)], {
			type: "application/json;charset=utf-8"
		});
		saveAs(blob, script_title + '.terry');
	}

	// save button
	$('a.toolbar-button.save').click(function() {
		saveScript();
	});
});

// content editable change events
// from http://stackoverflow.com/questions/1391278/contenteditable-change-events
$('body').on('focus', '[contenteditable]', function() {
		var $this = $(this);
		$this.data('before', $this.html());
		return $this;
}).on('blur keyup paste input', '[contenteditable]', function() {
		var $this = $(this);
		if ($this.data('before') !== $this.html()) {
				$this.data('before', $this.html());
				$this.trigger('change');
		}
		return $this;
});

// base64 encoder
/**
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*
**/
var Base64 = {

// private property
_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

// public method for encoding
encode : function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;

		input = Base64._utf8_encode(input);

		while (i < input.length) {

				chr1 = input.charCodeAt(i++);
				chr2 = input.charCodeAt(i++);
				chr3 = input.charCodeAt(i++);

				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;

				if (isNaN(chr2)) {
						enc3 = enc4 = 64;
				} else if (isNaN(chr3)) {
						enc4 = 64;
				}

				output = output +
				this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
				this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

		}

		return output;
},

// public method for decoding
decode : function (input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;

		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

		while (i < input.length) {

				enc1 = this._keyStr.indexOf(input.charAt(i++));
				enc2 = this._keyStr.indexOf(input.charAt(i++));
				enc3 = this._keyStr.indexOf(input.charAt(i++));
				enc4 = this._keyStr.indexOf(input.charAt(i++));

				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;

				output = output + String.fromCharCode(chr1);

				if (enc3 != 64) {
						output = output + String.fromCharCode(chr2);
				}
				if (enc4 != 64) {
						output = output + String.fromCharCode(chr3);
				}

		}

		output = Base64._utf8_decode(output);

		return output;

},

// private method for UTF-8 encoding
_utf8_encode : function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";

		for (var n = 0; n < string.length; n++) {

				var c = string.charCodeAt(n);

				if (c < 128) {
						utftext += String.fromCharCode(c);
				}
				else if((c > 127) && (c < 2048)) {
						utftext += String.fromCharCode((c >> 6) | 192);
						utftext += String.fromCharCode((c & 63) | 128);
				}
				else {
						utftext += String.fromCharCode((c >> 12) | 224);
						utftext += String.fromCharCode(((c >> 6) & 63) | 128);
						utftext += String.fromCharCode((c & 63) | 128);
				}

		}

		return utftext;
},

// private method for UTF-8 decoding
_utf8_decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;

		while ( i < utftext.length ) {

				c = utftext.charCodeAt(i);

				if (c < 128) {
						string += String.fromCharCode(c);
						i++;
				}
				else if((c > 191) && (c < 224)) {
						c2 = utftext.charCodeAt(i+1);
						string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
						i += 2;
				}
				else {
						c2 = utftext.charCodeAt(i+1);
						c3 = utftext.charCodeAt(i+2);
						string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
						i += 3;
				}

		}

		return string;
}

}
