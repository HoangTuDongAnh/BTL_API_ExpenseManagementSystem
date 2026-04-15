(function () {
    function updateZoomAvatar(uploadedAvatar, zoomedAvatar) {
        if (!uploadedAvatar || !zoomedAvatar) return;
        zoomedAvatar.src = uploadedAvatar.src;
    }

    function initProfileAvatarPicker(root) {
        var scope = root || document;
        var uploadedAvatar = scope.getElementById('uploadedAvatar');
        var zoomedAvatar = scope.getElementById('zoomedAvatar');
        var uploadAvatarFile = scope.getElementById('uploadAvatarFile');
        var hiddenAvatarInput = scope.getElementById('avatarUrl');
        var defaultOptions = scope.querySelectorAll('.default-avatar-option');
        var triggerUpload = scope.querySelector('[data-avatar-trigger="upload"]');

        if (!uploadedAvatar || !uploadAvatarFile || !hiddenAvatarInput) return;

        triggerUpload?.addEventListener('click', function () {
            uploadAvatarFile.click();
        });

        uploadAvatarFile.addEventListener('change', function (e) {
            var file = e.target.files && e.target.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function (event) {
                uploadedAvatar.src = event.target.result;
                hiddenAvatarInput.value = '';
                updateZoomAvatar(uploadedAvatar, zoomedAvatar);
            };
            reader.readAsDataURL(file);
        });

        defaultOptions.forEach(function (option) {
            option.addEventListener('click', function () {
                defaultOptions.forEach(function (item) { item.classList.remove('is-selected'); });
                option.classList.add('is-selected');

                var selectedUrl = option.getAttribute('data-url') || '';
                if (!selectedUrl) return;

                uploadedAvatar.src = selectedUrl;
                hiddenAvatarInput.value = selectedUrl;
                uploadAvatarFile.value = '';
                updateZoomAvatar(uploadedAvatar, zoomedAvatar);

                var modalEl = document.getElementById('defaultAvatarModal');
                if (modalEl) {
                    bootstrap.Modal.getOrCreateInstance(modalEl).hide();
                }
            });
        });

        updateZoomAvatar(uploadedAvatar, zoomedAvatar);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { initProfileAvatarPicker(document); });
    } else {
        initProfileAvatarPicker(document);
    }
})();
