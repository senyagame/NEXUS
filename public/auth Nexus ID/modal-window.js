// Модальное окно
window.openModal = function () {
    document.getElementById("modal").style.display = "block";
};

window.closeModal = function () {
    document.getElementById("modal").style.display = "none";
};

window.onclick = function (event) {
    if (event.target === document.getElementById("modal")) {
        closeModal();
    }
};