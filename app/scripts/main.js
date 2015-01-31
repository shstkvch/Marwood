$(function() {
	var element_types = ["scene-heading",  "action", "character", "dialogue",
											 "parenthetical", "transition",
											 "shot", "general"];
	var active_element_type = 0; // action
	var last_character_name = "";
	var page_max_inner_height = $("meta.maximum-inner-height").height();
	var script_title = "Untitled Script";

	$("div.page").focus();

	// every keyup in the editor
	$("div.page").keydown(function(e) {
		// establish what element we're in
		var $dom_element = getActiveDomElement();
		var element_type = $dom_element.attr("class");

		// override default tab behaviour
		if(e.which == 9) {
			e.preventDefault();

			// if the element we're on is blank, do the switcheroo!
			if($dom_element.text().trim().replace("&#8203;", "")) {
				switchElementType(e.shiftKey); // if shift is down then we go backwards
			} else {
				console.log("not switching element type",  "\"", $dom_element.text().trim().replace("&#8203;", ""), "\"");
				console.log($dom_element);
			}
		}

		// override default enter key behaviour
		if (e.which == 13) {
			e.preventDefault();

			var new_element_type = "action"; // the default
			var element_to_insert_after = $dom_element; // defaults to the last element

			// vary the new element based on what element we're currently in

			if(element_type == "character") {
				// after a character, insert a dialogue UNLESS we already have one
				// if we have one already, insert a parenthetical

				if($dom_element.next().attr("class") == "dialogue") {
					new_element_type = "parenthetical";

				} else {
					new_element_type = "dialogue";
				}

			} else if (element_type == "parenthetical") {
				// after a parenthetical, insert a dialogue

				new_element_type = "dialogue";

			} else if (element_type == "dialogue") {
				// after a dialogue, insert an action
				// UNLESS we had another character two elements ago (i.e. it's a
				// conversation between two characters

				if($dom_element.prev().prev().attr('class') == "dialogue") {
					new_element_type = "character";

				} else {
					// it's not a conversation, just default to action
					console.log('Not in a conversation');

					new_element_type = "action";
				}

			} else if (element_type == "action") {
				// after an action, insert a character

				new_element_type = "character";
			}

			console.log($dom_element.text().trim().replace("&#8203;", "") == "");

			if($dom_element.text().trim().replace("&#8203;", "") != "") {
				createNewElement(new_element_type, element_to_insert_after);
			}

			// todo: ghost autocomplete selection
		}
	});

	$("div.page").on('keydown focus click', function(e) {
		// establish what element we're in
		var $dom_element = getActiveDomElement();
		var element_type = $dom_element.attr("class");

		/// GENERAL ///

		// override default backspace key behaviour
		if (e.which == 8) {
			cleanupOrphanSpans();
			checkElementsExist();
		}

		// update the active element type
		active_element_type = element_types.indexOf(element_type);
		flashElementHud();

		console.log($dom_element.html());
	});

	$('div.page').change(function() {
		// every time the page changes, check we're not over
		// the inner height limit. if we are then we have to
		// move as much as possible to the next page.

		if(checkPageInnerHeight(this)) {
			// ...
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

		var $dom_element = getActiveDomElement();
		// FIXME: element chooser fades out too quickly if you hold tab down and
		//				cycle rapidly

		if(reverse) {
			var step = -1;
		} else {
			var step = 1;
		}

		setActiveElementIndex(active_element_type + step);
		flashElementHud();
	}

	function setActiveElementIndex(element_index) {
		// set the active element based on the numerical index of the element
		// i.e. "GENERAL" is "3"
		//
		// returns the text name of the element type

		var $dom_element = getActiveDomElement();

		element_index = element_index % element_types.length;
		if(element_index == -1) {
			element_index = element_types.length -1;
		}
		active_element_type = element_index;

		console.log('aet', active_element_type);

		$dom_element.attr("class", element_types[element_index]);

		// special case ghosting etc
		var new_ghost_text = "";
		if(element_types[element_index] == "character") {
			new_ghost_text = "Captain Peters";
		} else if (element_types[element_index] == "scene-heading") {
			new_ghost_text = "INT. Bridge - Day";
		} else if (element_types[element_index] == "transition") {
			new_ghost_text = "CUT TO:";
		}

		$dom_element.attr("data-ghost-text", new_ghost_text);

		return element_types[element_index];
	}

	function flashElementHud() {
		// flash the elements heads up display

		//$("div.hud .element-chooser").stop(true, true).show();
		$("div.hud .element-chooser li").removeClass("highlight");
		$("div.hud .element-chooser li:eq(" + active_element_type + ")").addClass("highlight");
		//$("div.hud .element-chooser").fadeOut(2000);
	}

	function checkElementsExist() {
		// make sure the user is typing into an element... if not
		// then we need to make a new element

		var $dom_element = getActiveDomElement();
		if($dom_element.hasClass("pages")) {
			// christ! it's fucked up! create a new action element...
			createNewElement("action");
			console.log("creating emergency action element...");
		}
	}

	function createNewElement(new_element_type, $element_to_insert_after) {
		// create a new element of the specified type & punt it into
		// the page
		var text_override = ""; // text to set for the new element

		if(!new_element_type) {
			new_element_type = "action";
		}

		var $dom_element = getActiveDomElement();

		// create the new element
		$new_element = $(document.createElement("p"));

		// pop it into the dom
		$element_to_insert_after.after($new_element);

		// special case stuff
		if(new_element_type == "parenthetical") {
			text_override = "()";
		}

		// todo - switch back to last used character from dialogue

		// set the element class
		$new_element.addClass(new_element_type);

		if(!text_override) {
			// ... and add an invisible character so blank elements work ...
			text_override = "&#8203;";
		}

		$new_element.html(text_override);

		// wahay!
		focusOnElement($new_element);

		// now update the active element index and flash the HUD
		active_element_type = element_types.indexOf(new_element_type);
		flashElementHud();

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
			elements: []
		};

		// set the title
		template.meta.title = script_title;

		// go through every page
		$(".page").each(function(page_index, page) {
			template.pages[page_index] = []

			$(page).find('p').each(function(index, element) {
				template.elements[index] = {
					element_type: $(element).attr('class'),
					text: $(element).text()
				}
			});
		});

		var blob = new Blob([JSON.stringify(template)], {
			type: "application/json;charset=utf-8"
		});
		saveAs(blob, script_title + '.marwood');
	}

	function getActiveDomElement() {
		var $dom_element = $(document.getSelection().anchorNode.parentNode);

		if($dom_element.hasClass('page')) {
			// it's cocked up, don't send the parent element -- send the
			// child instead.
			//
			// this seems to happen if an element has no text
			$dom_element = $(document.getSelection().anchorNode);
		}

		return $dom_element;
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
