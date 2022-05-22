function checkSubmission() {
    $.ajax({
        url: "/precheckEmail",
        method: "post",
        data: {
            email: $("#email").val()
        },
        success: (res) => {
            if (!res.exists) {
                $("#signupForm").submit();
            } else {
                $("#errorModalToggle").click();
            }
        }
    });
}