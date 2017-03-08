function is_touch_device() {
  return 'ontouchstart' in window        // works on most browsers
      || 'onmsgesturechange' in window;  // works on IE10 with some false positives
};

if(is_touch_device())
{
	$('#dropzone .if-drag').remove();
}


if('FileReader' in window)
{
	$('#file-select').hide();
}
else
{
	$('#dropzone').html("Your web browser is too old. If you want encryption anywhere - you'll need a modern browser that supports JavaScript, file uploads, and client-side encryption.");
}

var dragTimer;
$(document).on('dragover', function(e) {
	e.preventDefault();
	e.stopPropagation();

    var dt = e.originalEvent.dataTransfer;
    if(dt.types != null && (dt.types.indexOf ? dt.types.indexOf('Files') != -1 : dt.types.contains('application/x-moz-file'))) {
        $("#dropzone").addClass('dragover');
        window.clearTimeout(dragTimer);
    }
});
$(document).on('dragleave', function(e) {
	e.preventDefault();
	e.stopPropagation();

    dragTimer = window.setTimeout(function() {
        $("#dropzone").removeClass('dragover');
    }, 25);
});

$(document).on('drop', function(e) {
	e.stopPropagation();
	e.preventDefault();

    var dt = e.originalEvent.dataTransfer;
    if(dt) {
		console.log(e.originalEvent.dataTransfer.files);
        $("#dropzone").removeClass('dragover');
        window.clearTimeout(dragTimer);

		dt.dropEffect = 'copy';
		var file = dt.files[0];

	    if(file['size'] > 15000000)
	    {
		    alert("This file size exceeds the recommended use. Files over 15MB may fail to encrypt.");
	    }


		var reader = new FileReader();
		var input = this;

		 reader.onload = function (e) {
		    var result = e.target.result;

		    encrypt(result, file['name'], file['type']);
		 };

		 reader.readAsArrayBuffer(dt.files[0]);

    }
});

function toBitArrayCodec(bytes) {
    var out = [], i, tmp=0;
    for (i=0; i<bytes.length; i++) {
        tmp = tmp << 8 | bytes[i];
        if ((i&3) === 3) {
            out.push(tmp);
            tmp = 0;
        }
    }
    if (i&3) {
        out.push(sjcl.bitArray.partial(8*(i&3), tmp));
    }
    return out;
}


$('#status-encrypting, #status-download').hide();

Object.defineProperty(Number.prototype,'fileSize',{value:function(a,b,c,d){
 return (a=a?[1e3,'k','B']:[1024,'K','iB'],b=Math,c=b.log,
 d=c(this)/c(a[0])|0,this/b.pow(a[0],d)).toFixed(2)
 +' '+(d?(a[1]+'MGTPEZY')[--d]+a[2]:'Bytes');
},writable:false,enumerable:false});

function byteLength(str) {
  // returns the byte length of an utf8 string
  var s = str.length;
  for (var i=str.length-1; i>=0; i--) {
    var code = str.charCodeAt(i);
    if (code > 0x7f && code <= 0x7ff) s++;
    else if (code > 0x7ff && code <= 0xffff) s+=2;
    if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
  }
  return s;
}

var original_dropzone = $('#dropzone .default').html();

function encrypt(result, name, type)
{
	if(!result || !name)
	{
		$('#dropzone').removeClass('done');
		$('#dropzone .default').html(original_dropzone);
				console.log("return fuck it all");
		return;
	}


    if(!type || type == "")
    {
	    type = "application/octet-stream";
    }


	$('#status-encrypting span').text("Please enter a new password...");
	$('#status-encrypting').show(0, function()
	{
		$('#dropzone .title').text(name);
	    $("#dropzone").addClass('running');
		var pass = prompt("Create a password for this file (required)");
		if(pass)
		{
			$('#status-encrypting span').text("Your file is encrypting...");

			setTimeout(function()
			{
		        var bytes = new Uint8Array(result);
		        result = toBitArrayCodec(bytes);
		        result = sjcl.codec.base64.fromBits(result);

				try
				{
					console.log("start encrypting");
					result = sjcl.encrypt(pass, result);
				}
				catch(e)
				{
					alert("Your browser was unable to encrypt this file.");
					console.log(e);
				}

				if(result)
				{
					var file_html = original_html;
					file_html = file_html.replace(/\{\{file.name\}\}/g, name);
					file_html = file_html.replace(/\{\{file.mime\}\}/g, type);

					file_html = file_html.replace(/\{\{json\}\}/g, result);



					var base = btoa(unescape(encodeURIComponent(file_html)));

					if(byteLength(base) > 1490000)
					{
						$('#file-download').hide();
						$("#file-download-swf").downloadify({ 'swf' : '/downloadify.swf', 'downloadImage' : 'download.png?v=1', 'filename' : name+'.html', 'data' : base, 'dataType' : 'base64', 'transparent' : true, 'width' : 127, 'height': 33}).show();
					}
					else
					{
						$("#file-download-swf").hide();
						$('#file-download').attr('download', name+".html").attr('href', "data:text/html;charset=utf-8;base64,"+base).html("Download <small>("+byteLength(file_html).fileSize()+")</small>").show();
					}

					$('#status-encrypting').hide();
					$('#status-download').show();
			        $("#dropzone").addClass('done');

				}
				else
				{
					alert("Password invalid...");
				}
			}, 50);


		}
		else
		{
			$('#dropzone .default').html(original_dropzone);
		}

		setTimeout(function()
		{
		    $("#dropzone").removeClass('running');
			$('#status-encrypting').hide();
		}, 100);
	});

}

$('#start-over').click(function()
{
	$('#file-select').trigger('click');
});

$('#file-select').change(function()
{
	var reader = new FileReader();
	var input = this;

	if(!input.files.length)
	{
		return;
	}

	 reader.onload = function (e) {
	    var result = e.target.result;
	    console.log(input.files[0], result == false);

	    if(input.files[0]['size'] > 15000000)
	    {
		    alert("This file size exceeds the recommended use. Files over 15MB may fail to encrypt.");
	    }

	    encrypt(result, input.files[0]['name'], input.files[0]['type']);
	 };

	 reader.onerror = function (e) {
		 console.log(e);
	 };

	 reader.readAsArrayBuffer(input.files[0]);
});
