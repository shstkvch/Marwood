$(function() {
	$('.import-test').submit(function(e) {
		e.preventDefault();

		var fdXml = $('#fd-xml-input').val();

		var element_types = ["scene-heading",  "action", "character", "dialogue",
											"parenthetical", "transition",
											"shot", "general"];

		var parsed = $.parseXML(fdXml);
		window.$xml = $(parsed);

		if($xml.find('FinalDraft')) {
			console.log('Looks like a final draft document...');

			var marwood_template = {
				meta: {
					title: ""
				},
				elements: [],
				known_characters: []
			}

			// loop through every paragraph, adding the text to the object
			var $paragraphs = $xml.find('Paragraph');

			$paragraphs.each(function(index, paragraph) {
				var $paragraph = $(paragraph);
				var paragraph_text = "";
				var paragraph_type = ""; //

				// loop through the paragraph and concatenate all the text together

				var $texts = $paragraph.find('Text');

				$texts.each(function(index, text) {
					var $text = $(text);
					paragraph_text += $(text).text();
				});

				// bit naive but should work for now
				if($paragraph.attr('Type') !== undefined) {
					paragraph_type = $paragraph.attr('Type').toLowerCase().replace(' ', '-');
				}

				if($paragraph.attr('Type') == "Character") {
					var character_name_clean = cleanElementText(
						$paragraph.text().toLowerCase()
					);

					if(marwood_template.known_characters.indexOf(character_name_clean) == -1) {
						var character_index = marwood_template.known_characters.push(character_name_clean);
					} else {
						var character_index = marwood_template.known_characters.indexOf(character_name_clean);
					}
				} else if ($paragraph.attr('Type') == "Dialogue") {
					var $parent_char = $paragraph.prevUntil('[Type="Character"]').prev();

					var character_name_clean = cleanElementText(
						$parent_char.text().toLowerCase()
					);

					var character_index = marwood_template.known_characters.indexOf(character_name_clean);
					console.log('Should be a char:', $parent_char, $paragraph);
				}

				marwood_template.elements.push({
					element_type: paragraph_type,
					text: paragraph_text,
					character_index: character_index || undefined
				});
			});

			console.log(marwood_template);
		}
	});


	function cleanElementText(text) {
		return text.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
	}

});
