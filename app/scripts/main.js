$(function() {
	var marwood_version = "0.02";
	var element_types = ["scene-heading",  "action", "character", "dialogue",
											 "parenthetical", "transition",
											 "shot", "general"];
	var scene_heading_intros = ["INT.", "EXT.", "I/E."];
	var scene_heading_locations = [];
	var scene_heading_times = ["AFTERNOON", "CONTINUOUS", "DAY", "EVENING",
											 "LATER", "MOMENTS LATER", "MORNING", "NIGHT",
											 "THE NEXT DAY"];
	var active_element_type = 0; // action
	var last_character_name = "";
	window.page_max_inner_height = $("meta.maximum-inner-height").height();
	var default_script_title = "Untitled Script";
	var script_title = default_script_title;
	var application_state = "default"; // default, character_chooser,
																		 // scene_chooser
	var autocorrect_hints = true;
	var known_characters = new Array; // every unique character element value

	$("div.pages").children().first().focus();

	// every keyup in the editor
	$("body").on('keydown', 'div.pages', function(e) {
		// establish what element we're in
		var $dom_element = getActiveDomElement();
		var element_type = $dom_element.attr("class");

		console.log(e);

		// override default tab behaviour
		if(e.which == 9) {
			e.preventDefault();

			// if the element we're on is blank, do the switcheroo!
			//if(isBlankElement($dom_element)) {
				switchElementType(e.shiftKey); // if shift is down then we go backwards
			//}

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

				if(application_state == "character_chooser"
					 && isBlankElement($dom_element))
						{
					// select the ghosted character and set the element text to it
					var character_index = $dom_element.attr('data-character-index');
					if(character_index) {
						$dom_element.text(known_characters[character_index]);
					}
				}

				if($dom_element.next().attr("class") == "dialogue") {
					new_element_type = "parenthetical";
				} else {
					new_element_type = "dialogue";
				}

				var character_name_clean = cleanElementText($dom_element.text().toLowerCase());

				if(character_name_clean == "") {
					return; // abandon it
				}

				if(known_characters.indexOf(character_name_clean.toUpperCase()) == -1) {
					known_characters.push(character_name_clean.toUpperCase());

					console.log('added', character_name_clean, 'to known characters');
				} else {
					console.log(character_name_clean, 'already in known characters');
				}

				// update the data-character-id for this element
				var character_index = known_characters.indexOf(character_name_clean.toUpperCase());
				$dom_element.attr('data-character-index', character_index);

				updateKnownCharactersHud();

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
				var character_index = known_characters.indexOf(character_name_clean.toUpperCase());

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

		// override left bracket key behaviour (for adding V.O. etc to char names)
		if(e.which == 57) {
			// TODO: override the bracket behaviour (and check that keycode is right)
		}
	});

	$("div.pages").on("keyup focus click", function(e) {
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
		updateElementHud();
		updateKnownCharactersHud();


		$(".chooser.from-right").removeClass("visible");

		// override default ALT key behaviour (for switching between characters)

		// note - this must be in keyup b/c it breaks ALT + backspace (delete words)
		// otherwise
		if(e.which == 18) {
			e.preventDefault();

			if(application_state == "character_chooser") {
				// ...
				switchCharacter(e.shiftKey);

			} else if (application_state == "scene_chooser") {
				// ...
			}

			// not doing anything
		}

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

				if(known_characters.length) {

					var $possible_partner = $dom_element.prev().prev().prev().prev();

					if (  $possible_partner.hasClass('character')
						&& $possible_partner.attr("data-character-index")
						&& !$dom_element.attr('data-ghost-text')) {

						console.log('found conversational partner');

						// found a conversation partner
						partner_name = known_characters[$possible_partner.attr("data-character-index")];

						$dom_element.attr('data-ghost-text', partner_name);
						$dom_element.attr('data-character-index', $possible_partner.attr("data-character-index"));
					} else if(!$possible_partner.hasClass('character')
						&& !$dom_element.attr('data-ghost-text')) {

						// there's no partner, pick a default character

						$dom_element.attr('data-ghost-text', known_characters[0]);
						$dom_element.attr('data-character-index', 0);
					} else if ($dom_element.attr('data-ghost-text')) {

						// do nothing

					}

				}

			} else {
				$dom_element.removeAttr('data-ghost-text');
			}

		} else {
			// back to the default application state

			application_state = "default";
		}

		console.log($dom_element.html());
	});

	$("div.pages").on('change', 'div.page', function() {
		// every time the page changes, check we're not over
		// the inner height limit. if we are then we have to
		// move as much as possible to the next page.

		var $elements_to_move = checkPageInnerHeight($(this));

		if($elements_to_move) {

			if($(this).next().is(':empty')) {
				var $new_page = $(this).next();
			} else {
				var $new_page = $(document.createElement('div'));
			}

			$new_page.attr('class', 'page');

			$(this).after($new_page);

			$new_page.append($elements_to_move);
		}

		cleanupPage($(this));
	});

	// copy & paste
	$('div.pages').on('cut copy paste', function(e) {
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

		// TODO: remove any non-existent characters from the known_characters array

		// remove any blank Ps
		$page.find("p:empty").remove();
	}

	function focusOnElement($element) {
		// this is really dodgy to be honest.
		// force focus on element by switching contenteditable about
		//
		// this is the only way i could find to force the focus on to
		// another element within a contenteditable. maybe there's
		// a way to actually move the caret?

		$("div.pages").removeAttr("contenteditable");
		$element.attr("contenteditable", "").focus();

		// TODO:  move the caret to the end of the element

		setTimeout(function() {
			$("div.pages").attr("contenteditable", "").focus();
			$element.removeAttr("contenteditable");
		}, 50);
	}

	function switchElementType(reverse) {
		var $dom_element = getActiveDomElement();

		$dom_element.attr('data-ghost-text', '');

		if(reverse) {
			var step = -1;
		} else {
			var step = 1;
		}

		setActiveElementIndex(active_element_type + step);
		updateElementHud();
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

		// flash the element to indicate the element type has changed
		$dom_element.stop()
			.css({color: "#ff8c44"})
			.animate({color: "#E6E6E6"}, 200);

		return element_types[element_index];
	}

	function switchCharacter(reverse) {

		var $dom_element = getActiveDomElement();

		var active_character = $dom_element.attr('data-character-index') - 0;

		if(reverse) {
			var step = -1;
		} else {
			var step = 1;
		}

		active_character = (active_character + step) % known_characters.length;

		console.log(active_character, known_characters.length);

		if(active_character == -1) {
			active_character = known_characters.length -1;
		}

		$dom_element.attr('data-character-index', active_character);

		// now update the character name of the current dom element
		var new_name = known_characters[active_character];

		// we do a wee flash from blue to white to signify it changing
		// find the element we need to flash
		var $dom_element_to_flash = undefined;

		if($dom_element.hasClass('character')) {

			if($dom_element.attr('data-ghost-text')) {

				// ghost if we have ghost text
				$dom_element.attr('data-ghost-text', new_name);

			} else {

				// change the text to the character name
				$dom_element.text(new_name)
					.attr('data-character-index', active_character);

				$dom_element_to_flash = $dom_element;

				if($dom_element.next().hasClass('dialogue')) {
					$dom_element.next()
						.attr('data-character-index', active_character);
				}

			}

		} else if($dom_element.hasClass('dialogue')) {
			// find the character element for this dialogue

			if($dom_element.prev().hasClass('character')) {
				// found it

				$dom_element.prev().text(new_name)
					.attr('data-character-index', active_character)
					.attr('data-ghost-text', '');

				$dom_element_to_flash = $dom_element.prev();

				// update the active character for this too
				$dom_element.attr('data-character-index', active_character);
			} else {
				// TODO: traverse until we find parent character element
			}
		}

		// flash the dom element
		if($dom_element_to_flash) {
			$dom_element_to_flash.stop()
				.css({color: "#4479ff"})
				.animate({color: "#E6E6E6"}, 200);
		}

		updateKnownCharactersHud();
	}

	function updateElementHud() {
		$("div.hud .element-chooser li").removeClass("highlight");
		$("div.hud .element-chooser li:eq(" + active_element_type + ")").addClass("highlight");
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

		// update the active character
		var active_character_on_element = $dom_element.attr('data-character-index');
		if (active_character_on_element) {;
			$('.character-chooser ul li:eq(' + active_character_on_element + ')')
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

	function createNewElement(new_element_type, $element_to_insert_after, text, char_index) {
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
		if($element_to_insert_after) {
			$element_to_insert_after.after($new_element);
		} else {
			$('div.page').append($new_element);
		}

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

		// when laoding in from a file we need to set text & char index
		if(text) {
			text_override = text;
		}

		if(char_index) {
			$new_element.attr('data-character-index', char_index);
		}

		if(!text_override) {
			// ... and add an invisible character so blank elements work ...
			text_override = "&#8203;";
		}

		$new_element.html(text_override);

		// wahay!
		focusOnElement($new_element);

		// now update the active element index and flash the HUD
		active_element_type = element_types.indexOf(new_element_type);
		updateElementHud();

		return $new_element;
	}

	function checkPageInnerHeight($page) {
		// checks the innerheight of a page to see
		// if it's over the acceptable limit.
		//
		// if it is, then a pagebreak is needed & we return the elements
		// that need moved to the next page

		var elements_to_move = new Array;

		$page.find('p').each(function(i,element) {
			var element_offset = $(element).position().top;

			if(element_offset > page_max_inner_height) {
			 	elements_to_move.push(element);
			}
		});

		return $(elements_to_move);
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
				title: script_title,
				marwood_version: undefined
			},
			elements: [],
			known_characters: []
		};

		// set the title
		template.meta.title = script_title;

		// set the version number
		template.meta.marwood_version = marwood_version;

		template.known_characters = known_characters;

		// go through every page
		$(".page").each(function(page_index, page) {
			$(page).find('p').each(function(index, element) {
				template.elements[index] = {
					element_type: $(element).attr('class'),
					text: $(element).text(),
					character_index: $(element).attr('data-character-index')
				}
			});
		});

		var blob = new Blob([JSON.stringify(template)], {
			type: "application/json;charset=utf-8"
		});
		saveAs(blob, script_title + '.marwood');
	}

	function loadScript(e) {
		// TODO: redo all this properly, and load in the known characters

		var reader = new FileReader();
		reader.onload = function() {
			var script_raw = reader.result;

			// parse into json

			var script = JSON.parse(script_raw);

			$('div.page').empty();

			if(script.meta) {
				// seems fine then

				if(!script.meta.marwood_version) {
					alert('Sorry, can\'t load it. It doesn\'t look like a marwood file.');
					return;
				}

				// load it into the DOM
				script_title = script.meta.title;

				$('h1.screenplay-name').text(script_title);

				$(script.elements).each(function(i,element) {
					createNewElement(element.element_type, undefined, element.text, undefined);
				});
			}
		}

		// now read it
		reader.readAsText(e.target.files[0]);
	}

	$('input.file-chooser').change(function(e) {
		loadScript(e);
	});

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

	$('a.toolbar-button.load').click(function() {
		loadScript();
	});

	$('h1.screenplay-name').click(function() {
		$(this).attr('contenteditable', '').focus().addClass('editing');

		if($(this).text() == default_script_title) {
			$(this).text("");
		}

	}).keypress(function(e) { // TODO: tidy below up
		if(e.which == 13) {
			$(this).removeAttr('contenteditable').removeClass('editing');
			script_title = $(this).text();
		}
	}).blur(function(e) {
		if ($(this).text().trim() == "") {
			$(this).text(default_script_title);
		}

		$(this).removeAttr('contenteditable').removeClass('editing');
		script_title = $(this).text();
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

function moveCursorToEnd(el) {
		if (typeof el.selectionStart == "number") {
				el.selectionStart = el.selectionEnd = el.value.length;
		} else if (typeof el.createTextRange != "undefined") {
				el.focus();
				var range = el.createTextRange();
				range.collapse(false);
				range.select();
		}
}
