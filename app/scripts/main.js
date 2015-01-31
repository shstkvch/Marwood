$(function() {
	var element_types = ["scene-heading",  "action", "character", "dialogue",
											 "parenthetical", "transition",
											 "shot", "general"];
	var active_element_type = 0; // action
	var last_character_name = "";
	var page_max_inner_height = $("meta.maximum-inner-height").height();
	var script_title = "Untitled Script";
	var application_state = "default"; // default, character_chooser,
																		 // scene_chooser
	var autocorrect_hints = true;
	var known_characters = new Array; // every unique character element value

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
			if(isBlankElement($dom_element)) {
				switchElementType(e.shiftKey); // if shift is down then we go backwards
			}

			console.log(isBlankElement($dom_element), $dom_element);
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

				if(	 isBlankElement($dom_element)
					&& application_state != "character_chooser") {
					return;
				}

				if($dom_element.next().attr("class") == "dialogue") {
					new_element_type = "parenthetical";
				} else {
					new_element_type = "dialogue";
				}

				var character_name_clean = cleanElementText($dom_element.text().toLowerCase());

				if(known_characters.indexOf(character_name_clean.toUpperCase()) == -1) {
					known_characters.push(character_name_clean.toUpperCase());

					console.log('added', character_name_clean, 'to known characters');
				} else {
					console.log(character_name_clean, 'already in known characters');
				}

				// update the data-character-id for this element
				var character_index = known_characters.indexOf(character_name_clean);
				$dom_element.attr('data-character-index', character_index);

				updateKnownCharactersHud();

				// are in chooser mode? if so, user just made a choice by hitting enter
				if(application_state == "character_chooser") {
					alert('Chose!');
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

				// update the data-character-id for this element
				var character_name = $dom_element.prev('.character').text();
				var character_name_clean = cleanElementText(character_name);
				var character_index = known_characters.indexOf(character_name_clean);

				$dom_element.attr('data-character-index', character_index);

			} else if (element_type == "action") {
				// after an action, insert a character

				new_element_type = "character";
			}

			if(!isBlankElement($dom_element)) {
				createNewElement(new_element_type, element_to_insert_after);

				// tidy & process the new element
				tidyElement($dom_element);
			}

			// todo: ghost autocomplete selection
		}

		// override default ALT key behaviour (for switching between characters)
		if(e.which == 18) {
			e.preventDefault();

			if(application_state == "character_chooser") {
				// ...
			} else if (application_state == "scene_chooser") {
				// ...
			}

			// not doing anything
		}
	});

	$("div.page").on("keyup focus click", function(e) {
		// establish what element we're in
		var $dom_element = getActiveDomElement();
		var element_type = $dom_element.attr("class");

		/// GENERAL ///

		// override default backspace key behaviour
		if (e.which == 8) {
			cleanupPage($(this));
			checkElementsExist();
		}

		// update the active element type
		active_element_type = element_types.indexOf(element_type);
		flashElementHud();
		updateKnownCharactersHud();

		$(".chooser.from-right").removeClass("visible");

		// special cases -- show HUD on right for certain elements
		if(element_type == "character" || element_type == "dialogue") {
			// reveal the character name chooser

			if(!known_characters.length) {
				return;
			}

			$(".chooser.from-right.character-chooser").addClass("visible");

			// update the application state
			application_state = "character_chooser";

			// are we on a blank character element?

			if(element_type == "character" && isBlankElement($dom_element)) {
				console.log('ghosting...');
			}
		} else {
			// back to the default application state

			application_state = "default";
		}

		console.log($dom_element.html());
	});

	$("div.page").change(function() {
		// every time the page changes, check we're not over
		// the inner height limit. if we are then we have to
		// move as much as possible to the next page.

		if(checkPageInnerHeight()) {
			// ...
		}

		cleanupPage($(this));
	});

	// copy & paste
	$('div.page').on('cut copy paste', function(e) {
		var clipboard_data = e.originalEvent.clipboardData;

		if(e.type == "copy" || e.type == "cut") {
				var plainText = clipboard_data.getData('text/plain');
				console.log('pt', plainText);
		} else {
			console.log(clipboard_data.getData('html'));
			//e.preventDefault();

			cleanupPage($(this), true);
		}

	});


	// general functions
	function cleanupPage($page, after_paste) {
		// sometimes when you delete an element we end up with dodgy
		// spans appearing out of nowhere, ruining the formatting.
		//
		// this tidies them up a bit.

		console.log('cleaning up', $page);

		$page.find("span:not(.marwood-inline)").each(function(index, span) {
			var innerText = $(span).text();
			console.log('cleaning span', span);
			$(span).replaceWith(innerText);
		});

		// remove any inline styles that have mysteriously appeared
		$page.find('p').removeAttr('style');

		// everything that's not a P, turn it into a P.general
		var $dodgy_children = $('.page').children().not('p');
		$dodgy_children.each(function(index, child) {
			var inner_text = $(child).text();

			$(child).replaceWith('<p class="general">' + inner_text + "</p>");
		});

		if(after_paste) {
			// sometimes if you try and paste in shitloads
			// it'll all go in a scene-heading div (since it's the default)
			//
			// replace with general
			$page.find('p.scene-heading + p.scene-heading')
				.removeClass('scene-heading')
				.addClass('general');
		}

		// remove any blank Ps
		$page.find('p:empty').remove()
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
			// if we have a suggested character name, ghost it
			console.log("looking for partner");

			var $possible_partner = $dom_element.prev().prev().prev().prev()	;

			if (  $possible_partner.hasClass('character')
				 && $possible_partner.attr("data-character-index")) {

				console.log('found conversational partner');

				// found a conversation partner
				partner_name = known_characters[$possible_partner.attr("data-character-index")];

				new_ghost_text = partner_name;
			}

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

	function updateKnownCharactersHud() {
		// add any new names to the HUD and update the highlighted name

		var $dom_element = getActiveDomElement();

		$('.character-chooser ul').empty();

		for(index in known_characters) {
			var name = known_characters[index];

			$('.character-chooser ul').append(
				'<li class="character-' + index + '">' + name.toProperCase() + '</li>'
			);
		}

		// highlight the character that is currently active
		var character_index = $dom_element.attr('data-character-index');
		$('.character-chooser ul li').removeClass('highlight');

		if(isNaN(character_index)) {
			// panic
			console.warn('No character index for this element!!', $dom_element);
		} else {
			$('.character-chooser ul li:eq(' + character_index + ')')
				.addClass('highlight');
		}
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
		} else if (new_element_type == "dialogue") {
			// inherit the parent's character index if available
			$new_element.attr('data-character-index', $new_element.prev().attr('data-character-index'));
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

	function isBlankElement($element) {
		// quick function to tell if an element is blank

		return $element.text().trim().replace(/[\u200B-\u200D\uFEFF]/g, '') == "";
	}

	function cleanElementText(text) {
		return text.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
	}

	function tidyElement($element) {
		// TODO: spelling suggestions, highlighting etc.
		// FIXME: only corrects one at a time for some reason
		
		var type_of_element = $element.attr('class');

		if(type_of_element == "action"
			 || type_of_element == "general") {

			console.log('tidying element', $element);

			// replace any references to character names with uppercase versions.
			var old_string = $element.html();
			var new_string;

			for(index in known_characters) {
				var name = known_characters[index];
				var index;

				if(index = $element.html().toLowerCase().indexOf(name.toLowerCase()) > -1) {
					if(old_string.indexOf(name) < 0) {
						// only correct if it's not already okay
						if(autocorrect_hints) {
							new_string = old_string.replaceAll(name, "<span class='marwood-inline autocorrect'>" + name + "</span>");
						} else {
							new_string = old_string.replaceAll(name, name);
						}
						console.log('new string', new_string);

					} else {
						console.log('not adjusting old string, its fine', old_string, name);
					}
				} else {
					console.log('boo', $element.text().toLowerCase().indexOf(name), name);
				}
			}

			if(new_string) {
				$element.html(new_string); // update it
			}
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

	//// INTERFACE

	// save button
	$('a.toolbar-button.save').click(function() {
		saveScript();
	});

	$('h1.screenplay-name').click(function() {
		$(this).attr('contenteditable', '').focus().addClass('editing');

		if($(this).text() == "Untitled Screenplay") {
			$(this).text("");
		}
	}).keypress(function(e) {
		if(e.which == 13) {
			$(this).removeAttr('contenteditable').removeClass('editing');
		}
	}).blur(function(e) {
		$(this).removeAttr('contenteditable').removeClass('editing');
	});

	// autocorrect
	$('div.page').on('click', 'span.marwood-inline', function() {
		alert("Marwood corrected this character name into uppercase automatically. If you find this really annoying, unfortunately there's no way to turn it off right now.")
		// let's try and not be annoying
		autocorrect_hints = false;
		$('span.marwood-inline').each(function(index, element) {
			var $element = $(element);
			$element.replaceWith($element.text()); // remove the hint
		});
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

// misc
String.prototype.toProperCase = function () {
		return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};
String.prototype.replaceAll = function(strReplace, strWith) {
		var reg = new RegExp(strReplace, 'ig');
		return this.replace(reg, strWith);
};
