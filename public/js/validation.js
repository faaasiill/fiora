const form = document.getElementById('form');
const name_input = document.getElementById('name-input');
const email_input = document.getElementById('email-input');
const phone_input = document.getElementById('phone-input');
const password_input = document.getElementById('password-input');
const confirmpassword_input = document.getElementById('confirm-password');
const error_message = document.getElementById('error-message');

form.addEventListener('submit', (e) => {
    

    let errors = []

     if(name_input){
        errors = getSignupFormErrors(name_input.value, email_input.value, phone_input.value, password_input.value, confirmpassword_input.value)
     }else{
        errors = getLoginFormErrors(email_input.value, password_input.value);
     }

     if(errors.length > 0){
        console.log(errors.length);
        e.preventDefault();
        console.log("Errors detected, preventing form submission:", errors);
        error_message.innerText = errors.join('. ')
        
     }
});

function getLoginFormErrors(email, password) {
    let errors = [];

    if(email === "" || email == null){
        errors.push('email is required');
        email_input.parentElement.classList.add('incorrect');
    }   
    if(password === "" || password == null){
        errors.push('password is required');
        password_input.parentElement.classList.add('incorrect');
    }
    if(password.length < 8){
        errors.push('password must be at least 8 characters');
        password_input.parentElement.classList.add('incorrect');
    }
    return errors;
}



function getSignupFormErrors(name, email, phone, password, confirmpassword) {
    let errors = []
    const namepattern = /^[A-Za-Z\s]+$/;


    if(name === "" || name == null){
        errors.push('name is required');
        name_input.parentElement.classList.add('incorrect');
    }else if(!namepattern.test(name)){
        errors.push('name must be letters only');
        name_input.parentElement.classList.add('incorrect');
    }
    if(email === "" || email == null){
        errors.push('email is required');
        email_input.parentElement.classList.add('incorrect');
    }
    if(phone === "" || phone == null || !/^\d{10}$/.test(phone_input.value)){
        errors.push('Please enter a valid 10-digit phone number');
        phone_input.parentElement.classList.add('incorrect');
    }
    if(password === "" || password == null){
        errors.push('password is required');
        password_input.parentElement.classList.add('incorrect');
    }
    if(password.length < 8){
        errors.push('password must be at least 8 characters');
        password_input.parentElement.classList.add('incorrect');
    }
    if(password !== confirmpassword){
        errors.push('passwords do not match repeated password');
        password_input.parentElement.classList.add('incorrect');
        confirmpassword_input.parentElement.classList.add('incorrect');

    }

    return errors;
}

const allInputs = [name_input, email_input, phone_input, password_input, confirmpassword_input].filter(input => input !== null);

allInputs.forEach(input => {
    input.addEventListener('input', () => {
       if(input.parentElement.classList.contains('incorrect')){
        input.parentElement.classList.remove('incorrect');
        error_message.innerText = ''
       }
    })
})