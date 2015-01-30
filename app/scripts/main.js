$(function() {
	var last_mouse_x = null;
	var last_mouse_y = null;
	var mouse_down = false;

	$('body').on('mousedown', '.page p', function(e) {
		last_mouse_x = e.pageX;
		last_mouse_y = e.pageY;
		$(this).blur();

	});
	$('body').on('mousemove', '.page p', function(e) {
		last_mouse_x = e.screenX;
		last_mouse_y = e.screenY;
	});

	$('body').on('mouseup', '.page p', function(e) {
		//if(last_mouse_x == e.pageX ||
		//	 last_mouse_y == e.pageY) {
			$(this).attr('contenteditable', '');
			$(this).focus();
		//}
	});

	$('body').on('blur', '.page p', function() {
		$(this).removeAttr('contenteditable');
	})

	$('body').on('keydown', '.page p', function(e) {
		if($(this).text() == '') {
			if(e.which == 8) {
				e.preventDefault();
				$(this).prev().attr('contenteditable','').focus();
			}
			$(this).remove();
		}
		var selectionOffset = document.getSelection().baseOffset;

		// left arrow
		if(e.which == 37 && selectionOffset == 0) {
			$(this).blur();
			$(this).prev().attr('contenteditable','').focus();
			document.getSelection().collapseToEnd();

		// right arrow
		} else if(e.which == 39 && selectionOffset == $(this).text().length) {
			$(this).blur();
			$(this).next().attr('contenteditable','').focus();
			document.getSelection().collapseToStart();

		// enter
	} else if (e.which == 13) {
		$(this).blur();
		e.preventDefault();

		insertElement($(this));
	}

	});

	function insertElement($this) {
		// show the new element prompt

		var elementToInsert = 'scene-heading';
		$this.after('<p class="' + elementToInsert + '"></p>');
		$this.blur();
		$this.next().attr('contenteditable','').focus();
	}
});
