(function () {
    const defaultAvatar = '/sneat/img/avatars/1.png';
    const form = document.getElementById('formProfileSettings');
    if (!form) return;

    const lastName = document.getElementById('lastName');
    const firstName = document.getElementById('firstName');
    const email = document.getElementById('email');
    const phoneNumber = document.getElementById('phoneNumber');
    const avatarUrl = document.getElementById('avatarUrl');
    const uploadedAvatar = document.getElementById('uploadedAvatar');
    const btnResetAvatar = document.getElementById('btnResetAvatar');
    const btnResetProfile = document.getElementById('btnResetProfile');
    const btnDeleteAccount = document.getElementById('btnDeleteAccount');

    const initialState = {
        lastName: lastName?.value || '',
        firstName: firstName?.value || '',
        email: email?.value || '',
        phoneNumber: phoneNumber?.value || '',
        avatar: avatarUrl?.value || ''
    };

    function updateAvatarPreview() {
        if (!uploadedAvatar || !avatarUrl) return;
        uploadedAvatar.src = avatarUrl.value.trim() || defaultAvatar;
    }

    function restoreInitialState() {
        lastName.value = initialState.lastName;
        firstName.value = initialState.firstName;
        email.value = initialState.email;
        phoneNumber.value = initialState.phoneNumber;
        avatarUrl.value = initialState.avatar;
        updateAvatarPreview();
    }

    avatarUrl?.addEventListener('input', updateAvatarPreview);
    btnResetAvatar?.addEventListener('click', function () {
        avatarUrl.value = '';
        updateAvatarPreview();
    });
    btnResetProfile?.addEventListener('click', restoreInitialState);

    form.addEventListener('submit', async function () {
        const payload = {
            lastName: lastName.value.trim(),
            firstName: firstName.value.trim(),
            email: email.value.trim(),
            phoneNumber: phoneNumber.value.trim(),
            avatar: avatarUrl.value.trim()
        };

        if (!payload.lastName && !payload.firstName) {
            alert('Vui lòng nhập họ tên.');
            return;
        }

        if (!payload.email) {
            alert('Vui lòng nhập email.');
            return;
        }

        try {
            const response = await fetch('/Profile/UpdateAjax', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                alert(data.message || 'Không thể cập nhật hồ sơ.');
                return;
            }

            alert(data.message || 'Cập nhật hồ sơ thành công.');
            window.location.reload();
        } catch (error) {
            alert('Đã xảy ra lỗi khi cập nhật hồ sơ.');
        }
    });

    btnDeleteAccount?.addEventListener('click', async function () {
        const ok = confirm('Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác.');
        if (!ok) return;

        try {
            const response = await fetch('/Profile/DeleteAccountAjax', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                alert(data.message || 'Không thể xóa tài khoản.');
                return;
            }

            window.location.href = data.redirectUrl || '/Auth/Login';
        } catch (error) {
            alert('Đã xảy ra lỗi khi xóa tài khoản.');
        }
    });

    updateAvatarPreview();
})();
