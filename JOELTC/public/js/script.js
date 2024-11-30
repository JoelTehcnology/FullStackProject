// Variables globales para almacenar autos y gastos
let cars = [];
let expenses = [];
let carToDelete = null;

// Función para formatear números con comas
function formatNumberWithCommas(value) {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
// Función para obtener autos desde el servidor
function fetchCars() {
    fetch('/getCars')
        .then(response => response.json())
        .then(data => {
            cars = data; // Guarda los autos en la variable global
            updateCarTable(); // Actualiza la tabla con los autos obtenidos
        })
        .catch(error => {
            console.error('Error:', error);
        });
}


// Función para calcular y mostrar el total de activos
function calculateTotalAssets() {
    fetch('/getTotalAssets')
        .then(response => response.json())
        .then(data => {
            console.log('Nuevo total de activos:', data.totalAssets); // Añadir para depurar
            document.getElementById('totalNeto').value = formatCurrency(data.totalAssets);
        })
        .catch(error => {
            console.error('Error al obtener el total de activos:', error);
        });
}


// Función para calcular la ganancia total
function calculateTotalGain() {
    fetch('/soldCars')
        .then(response => response.json())
        .then(soldCars => {
            // Calcular la ganancia total
            const totalGain = soldCars.reduce((total, sale) => {
                const profitOrLoss = parseFloat(sale.profitOrLoss.replace(/[^0-9.-]+/g, ''));
                
                // Solo sumar si es una ganancia (valor positivo)
                if (profitOrLoss > 0) {
                    return total + profitOrLoss;
                } else {
                    return total;
                }
            }, 0);

            // Actualizar los campos de ganancia
            document.getElementById('totalGainInventory').value = formatCurrency(totalGain);
            document.getElementById('totalGainSold').value = formatCurrency(totalGain);
        })
        .catch(error => {
            console.error('Error al obtener las ventas:', error);
        });
}
// Función para calcular la pérdida total
function calculateTotalLoss() {
    fetch('/soldCars')
        .then(response => response.json())
        .then(soldCars => {
            // Calcular la pérdida total
            const totalLoss = soldCars.reduce((total, sale) => {
                const profitOrLoss = parseFloat(sale.profitOrLoss.replace(/[^0-9.-]+/g, ''));

                // Solo sumar si es una pérdida (valor negativo)
                if (profitOrLoss < 0) {
                    return total + profitOrLoss;
                } else {
                    return total;
                }
            }, 0);

            // Actualizar los campos de pérdida
            document.getElementById('totalLossInventory').value = formatCurrency(Math.abs(totalLoss)); // Usar Math.abs para mostrar el valor positivo
            document.getElementById('totalLossSold').value = formatCurrency(Math.abs(totalLoss));
        })
        .catch(error => {
            console.error('Error al obtener las ventas:', error);
        });
}

// Función para formatear números con comas y signo de moneda
function formatCurrency(value) {
    return '$' + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Llamar a la función cuando la página se carga
document.addEventListener('DOMContentLoaded', () => {
    fetchCars(); // Llamar a fetchCars para obtener la lista actualizada de autos
    calculateTotalGain(); // Llamar a calculateTotalGain para mostrar la ganancia total
    calculateTotalLoss(); // Llamar a calculateTotalLoss para mostrar la pérdida total
    calculateTotalAssets(); // Mostrar el total de activos
});


// Llamar a la función fetchCars cuando se carga la página
document.addEventListener('DOMContentLoaded', fetchCars);
// Función para manejar la entrada de números con comas en tiempo real
function formatInputWithCommas(event) {
    const input = event.target;
    let value = input.value.replace(/,/g, ''); // Eliminar comas existentes

    if (!isNaN(value) && value !== '') {
        input.value = formatNumberWithCommas(value);
    } else {
        input.value = ''; // Limpiar el campo si el valor no es un número
    }
}

// Función para obtener el valor numérico sin comas
function getNumericValue(value) {
    return parseFloat(value.replace(/,/g, '')) || 0;
}

// Asignar el evento 'input' a los campos de Precio de Compra y Millas
document.getElementById('purchasePrice').addEventListener('input', formatInputWithCommas);
document.getElementById('miles').addEventListener('input', formatInputWithCommas);


// Función para agregar o actualizar un auto
function addCar() {
    const carId = document.getElementById('carForm').getAttribute('data-edit-id');
    const brand = document.getElementById('brand').value.trim();
    const model = document.getElementById('model').value.trim();
    const year = document.getElementById('year').value.trim();
    const miles = getNumericValue(document.getElementById('miles').value);
    const purchasePrice = getNumericValue(document.getElementById('purchasePrice').value);
    const description = document.getElementById('description').value.trim();
    const photo = document.getElementById('photo').files[0];
    const status = 'Disponible';

    // Validación de campos obligatorios
    if (!brand || !model || !year || isNaN(miles) || miles <= 0 || isNaN(purchasePrice) || purchasePrice <= 0) {
        showError('Todos los campos son obligatorios. Por favor, complete todos los campos!');
        return;
    }
    const formData = new FormData();
    formData.append('brand', brand.toUpperCase());
    formData.append('model', model.toUpperCase());
    formData.append('year', year);
    formData.append('miles', miles);
    formData.append('purchasePrice', purchasePrice);
    formData.append('description', description.toUpperCase());
    formData.append('photo', photo);
    formData.append('status', status);

    const url = carId ? `/updateCar/${carId}` : '/addCar'; // Determina la URL basada en si es una actualización o adición

    fetch(url, {
        method: carId ? 'PUT' : 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showError(data.error);
        } else {
            console.log(data.message);
            if (carId) {
                // Actualizar el auto en la lista local
                const carIndex = cars.findIndex(c => c.id === carId);
                if (carIndex !== -1) {
                    cars[carIndex] = { ...data.car, id: carId };
                }
            } else {
                cars.push({ ...data.car, id: data.id });
            }
            // Actualizar la tabla de autos
            fetchCars(); // Llama a fetchCars para obtener los datos actualizados
            clearForm('carForm');
            calculateTotalAssets();
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}
// Función para agregar o actualizar un gasto
function addExpense() {
    const expenseId = document.querySelector('button[onclick="addExpense()"]').getAttribute('data-edit-id');
    const carId = parseInt(document.getElementById('expenseCarId').value);
    const description = document.getElementById('expenseDescription').value;
    const expenseArray = description.split(',').map(exp => exp.trim());

        // Verificar si el auto existe en la lista de autos
        const car = cars.find(c => c.id === carId);
        if (!car) {
            showError('El auto no existe.');
            return;
        }

    
        // Verificar que el auto esté disponible
        if (car.status !== 'Disponible') {
            showError('No se pueden agregar gastos a un auto que ya ha sido vendido!');
            return;
        }
        if (description === '') {
            showError('La descripción del gasto no puede estar vacía!');
            return;
        }


     expenseArray.forEach(exp => {
        const [desc, amount] = exp.split(':');
        if (desc && amount) {
            const expenseData = {
                carId: carId,
                description: desc.trim().toUpperCase(),
                amount: parseFloat(amount.trim())
            };

            const url = expenseId ? `/updateExpense/${expenseId}` : '/addExpense';
            const method = expenseId ? 'PUT' : 'POST';

            fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(expenseData),
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showError(data.error);
                } else {
                    showSuccess(data.message);
                    // Actualizar la lista de gastos
                    if (expenseId) {
                        const expenseIndex = expenses.findIndex(e => e.id === expenseId);
                        if (expenseIndex !== -1) {
                            expenses[expenseIndex] = { ...data.expense, id: expenseId };
                        }
                    } else {
                        expenses.push({ ...data.expense, id: data.id });
                    }
                    clearForm('expenseForm'); // Limpiar el formulario después de agregar/actualizar
                    calculateTotalAssets();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showError('Error al agregar/actualizar gasto');
            });
        }
    });
}



// Función para mostrar un mensaje de éxito
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block'; // Mostrar el mensaje
        setTimeout(() => {
            successDiv.style.display = 'none'; // Ocultar el mensaje después de 3 segundos
        }, 3000);
    }
}
function confirmSellCar() {
    const sellIdElement = document.getElementById('sellId');
    const salePriceElement = document.getElementById('salePrice');
    const saleDateElement = document.getElementById('saleDate');

    if (!sellIdElement || !salePriceElement) {
        console.error('Elementos del formulario no encontrados!');
        return;
    }

    const carId = parseInt(sellIdElement.value, 10);
    const salePrice = getNumericValue(salePriceElement.value);
    const saleDate = saleDateElement ? saleDateElement.value : '';

    if (!carId || isNaN(salePrice) || salePrice <= 0) {
        showError('Todos los campos son obligatorios y el precio debe ser mayor que cero!');
        return;
    }

    // Mostrar el modal de confirmación
    document.getElementById('sellConfirmMessage').textContent = `¿Estás seguro de que deseas vender el auto con ID ${carId} por ${formatCurrency(salePrice)}?`;
    document.getElementById('sellConfirmModal').style.display = 'block';
}
function closeSellConfirmModal() {
    document.getElementById('sellConfirmModal').style.display = 'none';
}

function confirmSell() {
    // Llamar a la función original para vender el auto
    sellCar();

    // Cerrar el modal
    closeSellConfirmModal();
}

// Asignar eventos a los botones del modal de confirmación
document.getElementById('sellConfirmYesButton').addEventListener('click', confirmSell);
document.getElementById('sellConfirmNoButton').addEventListener('click', closeSellConfirmModal);


function sellCar() {
    const sellIdElement = document.getElementById('sellId');
    const salePriceElement = document.getElementById('salePrice');
    const saleDateElement = document.getElementById('saleDate');

    if (!sellIdElement || !salePriceElement) {
        console.error('Elementos del formulario no encontrados.');
        return;
    }

    const carId = parseInt(sellIdElement.value, 10);
    const salePrice = getNumericValue(salePriceElement.value);
    const saleDate = saleDateElement ? saleDateElement.value : '';

    if (!carId || isNaN(salePrice) || salePrice <= 0) {
        showError('Todos los campos son obligatorios y el precio debe ser mayor que cero!');
        return;
    }

    // Verificar si el auto existe en la lista de autos
    const car = cars.find(c => c.id === carId);
    if (!car) {
        showError('El auto no existe.');
        return;
    }

    // Verificar que el auto esté disponible
    if (car.status !== 'Disponible') {
        showError('El auto ya ha sido vendido o no está disponible para la venta!');
        return;
    }

    // Calcular el costo total de los gastos asociados al auto
    const totalExpenses = expenses.filter(exp => exp.carId === carId).reduce((sum, expense) => sum + expense.amount, 0);

    // Enviar la solicitud de venta al servidor
    fetch('/sellCar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ carId, salePrice, saleDate, totalCost: car.purchasePrice + totalExpenses }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showError(data.error);
        } else {
            console.log(data.message);
            // Actualizar el estado del auto localmente
            car.status = 'Vendido';
            car.salePrice = salePrice;
            car.totalCost = car.purchasePrice + totalExpenses;

            // Actualizar la vista y la lista de autos vendidos
           
            updateCarTable();
            showSoldCars();
            clearForm('saleForm');
            // Calcular y mostrar la ganancia total actualizada
            calculateTotalGain(); // Llama a esta función aquí
            calculateTotalLoss(); // Actualizar pérdida total
            calculateTotalAssets();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Error al procesar la venta.');
    });
}


// Función para convertir el valor a número
function getNumericValue(value) {
    return parseFloat(value.replace(/[^0-9.-]/g, ''));
}

// Función para mostrar el error
function showError(message) {
    document.getElementById('errorMessage').innerText = message;
    document.getElementById('errorModal').style.display = 'block';
}


// Función para actualizar la tabla de autos
function updateCarTable() {
    // Implementa la lógica para actualizar la tabla de autos disponibles
}



// Función para limpiar los formularios
function clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset(); // Limpia los campos de texto y números

        // Si hay campos de archivo, los reiniciamos manualmente
        const fileInputs = form.querySelectorAll('input[type="file"]');
        fileInputs.forEach(fileInput => fileInput.value = '');

        // Limpiar campos de gastos asociados si el formulario es de auto
        if (formId === 'carForm') {
            document.getElementById('expenseDescription').value = '';
            document.getElementById('expenseCarId').value = '';
            
            // Habilitar el botón de agregar gasto y volver al modo de agregar auto
            document.querySelector('button[onclick="addExpense()"]').disabled = false;
            document.querySelector('button[onclick="addCar()"]').textContent = 'Agregar Auto';
        }
    }
}

// Función para editar un auto
// Función para editar un auto y sus gastos
// Función para editar un auto
function editCar(carId) {
    const car = cars.find(c => c.id === carId);
    if (car) {
        // Cargar los valores en el formulario
        document.getElementById('brand').value = car.brand.toUpperCase();
        document.getElementById('model').value = car.model.toUpperCase();
        document.getElementById('year').value = car.year;
        document.getElementById('miles').value = formatNumberWithCommas(car.miles.toString());
        document.getElementById('purchasePrice').value = formatNumberWithCommas(car.purchasePrice.toString());
        document.getElementById('description').value = car.description.toUpperCase();
        document.getElementById('carForm').setAttribute('data-edit-id', car.id);
        document.querySelector('button[onclick="addCar()"]').textContent = 'Actualizar Auto';
        document.querySelector('button[onclick="addExpense()"]').disabled = true;

        // Cargar gastos del auto en el formulario de gastos
        fetch(`/getExpenses?carId=${carId}`)
            .then(response => response.json())
            .then(expenses => {
                if (expenses && Array.isArray(expenses)) {
                    const expenseForm = document.getElementById('expenseForm');
                    const expenseCarId = expenseForm.querySelector('#expenseCarId');
                    const expenseDescription = expenseForm.querySelector('#expenseDescription');

                    expenseCarId.value = carId;
                    expenseDescription.value = expenses.map(exp => `${exp.description.toUpperCase()}: ${formatNumberWithCommas(exp.amount.toString())}`)
                        .join(', ');
                } else {
                    showError('No se encontraron gastos para este auto!');
                }
            })
            .catch(error => {
                console.error('Error al obtener los gastos:', error);
                showError('Error al cargar los gastos.');
            });
    }
}

function deleteCar(carId) {
    const confirmation = confirm('¿Estás seguro de que deseas eliminar este auto? Esta acción no se puede deshacer.');

    if (confirmation) {
        console.log(`Eliminando el auto con ID: ${carId}`);  // Debugging
        fetch(`/deleteCar/${carId}`, {
            method: 'DELETE'
        })
        .then(response => {
            console.log('Respuesta del servidor DELETE:', response.status);  // Verificar respuesta
            if (!response.ok) {
                return response.json().then(err => Promise.reject(err));
            }
            return response.json();
        })
        .then(data => {
            console.log('Respuesta del servidor:', data); // Depurar respuesta del servidor

            if (data.error) {
                showError(data.error);
            } else {
                console.log(data.message);  // Mensaje de éxito
                fetchCars();  // Actualizar la tabla de autos
                calculateTotalAssets();  // Actualizar el total de activos
            }
        })
        .catch(error => {
            console.error('Error al eliminar el auto:', error);
            showError('Error al eliminar el auto.');
        });
    }
}



function openConfirmModal(carId) {
    carToDelete = carId;
    const confirmMessageElement = document.getElementById('confirmMessage');
    const confirmModalElement = document.getElementById('confirmModal');

    if (confirmMessageElement && confirmModalElement) {
        confirmMessageElement.textContent = '¿Estás seguro de que deseas eliminar este auto?';
        confirmModalElement.style.display = 'block';
    } else {
        console.error('El modal o el mensaje de confirmación no se encontraron.');
    }
}

// Función para cerrar el modal de confirmación
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

// Función para manejar la confirmación de eliminación
function confirmDelete() {
    if (carToDelete !== null) {
        fetch(`/deleteCar/${carToDelete}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showError(data.error);
            } else {
                console.log(data.message);
                // Actualizar la tabla de autos después de eliminar
                fetchCars(); // Llama a fetchCars para obtener la lista actualizada de autos
                closeConfirmModal(); // Cerrar el modal      
                calculateTotalAssets();  // Actualizar el total de activos      
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Error al eliminar el auto.');
        });
    }
}

// Asignar eventos a los botones del modal de confirmación
document.getElementById('confirmYesButton').addEventListener('click', confirmDelete);
document.getElementById('confirmNoButton').addEventListener('click', closeConfirmModal);

// Actualizar la función deleteCar para abrir el modal
function deleteCar(carId) {
    openConfirmModal(carId);
}

// Función para formatear la moneda en USD
function formatCurrency(value) {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

// Función para mostrar detalles del auto en un modal
function showCarDetails(carId) {
    const car = cars.find(c => c.id === carId);
    if (car) {
        const modalBody = document.getElementById('modal-body');

        // Obtener los gastos del servidor
        fetch(`/getExpenses?carId=${carId}`)
            .then(response => response.json())
            .then(expenses => {
                // Formatear los gastos
                const gastos = expenses.map(expense => 
                    `<p class="gastos-item">${expense.description.toUpperCase()}: ${formatCurrency(expense.amount)}</p>`
                ).join('') || '<p>No hay gastos registrados.</p>';

                const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
                const priceToBeat = formatCurrency(car.purchasePrice + totalExpenses);

                modalBody.innerHTML = `
                    <p><strong>ID:</strong> ${car.id}</p>
                    <p><strong>Marca:</strong> ${car.brand.toUpperCase()}</p>
                    <p><strong>Modelo:</strong> ${car.model.toUpperCase()}</p>
                    <p><strong>Año:</strong> ${car.year}</p>
                    <p><strong>Millas:</strong> ${car.miles.toLocaleString()}</p>
                    <p><strong>Precio de Compra:</strong> ${formatCurrency(car.purchasePrice)}</p>
                    <p><strong>Descripción:</strong> ${car.description.toUpperCase()}</p>
                    <div class="gastos">
                        <h3>Gastos:</h3>
                        ${gastos}
                    </div>
                    <p><strong>Inversion Total:</strong> ${formatCurrency(totalExpenses)}</p> <!-- Aquí se agrega el total de gastos -->
                    <p class="precio-superar"><strong>Precio a Superar:</strong> ${priceToBeat}</p>
                    ${car.photo ? `<img src="${car.photo}" alt="Foto del Auto">` : ''}
                `;
                openModal();
            })
            .catch(error => {
                console.error('Error al obtener los gastos:', error);
                modalBody.innerHTML = '<p>Error al cargar los gastos.</p>';
                openModal();
            });
    }
}


function showSoldCars() {
    fetch('/soldCars')
        .then(response => response.json())
        .then(soldCars => {
            const tbody = document.querySelector('#soldCarsTable tbody');
            tbody.innerHTML = '';

            soldCars.forEach(sale => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${sale.saleId}</td>
                    <td>${sale.brand}</td>
                    <td>${sale.model}</td>
                    <td>${sale.year}</td>
                    <td>${formatCurrency(sale.purchasePrice)}</td>
                    <td>${formatCurrency(sale.totalCost)}</td>   
                    <td>${formatCurrency(sale.salePrice)}</td>                             
                    <td class="${parseFloat(sale.profitOrLoss.replace(/[^0-9.-]+/g, '')) >= 0 ? 'profit' : 'loss'}">
                        ${formatCurrency(sale.profitOrLoss)}
                    </td>
                `;
                tbody.appendChild(row);
            });

            openSoldCarsModal();
        })
        .catch(error => {
            console.error('Error:', error);
        });
}


// Función para actualizar la tabla de autos
function updateCarTable() {
    const tableBody = document.querySelector('#carTable tbody');
    tableBody.innerHTML = '';

    cars.forEach(car => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${car.id}</td>
            <td>${car.brand}</td>
            <td>${car.model}</td>
            <td>${car.year}</td>
            <td>${formatCurrency(car.purchasePrice)}</td>
            <td>${car.status}</td>
            <td>
                <button onclick="showCarDetails(${car.id})">Ver Detalles</button>
                ${car.status === 'Disponible' ? `
                    <button onclick="editCar(${car.id})">Editar</button>
                    <button onclick="deleteCar(${car.id})">Eliminar</button>
                ` : ''}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function submitInvoice(event) {
    event.preventDefault();

    const buyerName = document.getElementById('buyerName').value.toUpperCase();
    const sellerName = document.getElementById('sellerName').value.toUpperCase();
    const brandd = document.getElementById('brandd').value.toUpperCase();
    const modell = document.getElementById('modell').value.toUpperCase();
    const color = document.getElementById('color').value.toUpperCase();
    const salePrice = document.getElementById('salePriceInvoice').value;
    const chassisNumber = document.getElementById('chassisNumber').value.toUpperCase();
    const saleDate = document.getElementById('saleDate').value;
    const saleActFile = document.getElementById('saleActFile').files[0]; // Archivo de imagen cargado

    // Verificar que todos los campos obligatorios estén llenos
    if (!buyerName || !sellerName || !brandd || !modell || !color || !salePrice || !chassisNumber || !saleDate) {
        showError('Por favor, complete todos los campos!');
        return; // Detener la ejecución si algún campo está vacío
    }


    const { jsPDF } = window.jspdf; 
    const doc = new jsPDF();

    const logo = new Image();
    logo.src = '/images/COMPAS2.png';

    logo.onload = () => {
        const logoWidth = 40;
        const logoHeight = 28;
        doc.addImage(logo, 'PNG', 160, 4, logoWidth, logoHeight);

        doc.setFontSize(18);
        doc.text(translations[currentLanguage].companyName, 68, 15);
        doc.text(translations[currentLanguage].slogan, 80, 25);

        doc.setFontSize(22);
        doc.text(translations[currentLanguage].title, 20, 30);

        doc.setDrawColor(0, 0, 0);
        doc.line(10, 35, 200, 35);

        doc.setFontSize(12);
        doc.setFont("Helvetica", "bold");
        doc.text(`${translations[currentLanguage].buyerName}:`, 20, 45);
        doc.text(`${translations[currentLanguage].sellerName}:`, 20, 55);
        doc.text(`${translations[currentLanguage].brand}:`, 20, 65);
        doc.text(`${translations[currentLanguage].model}:`, 20, 75);
        doc.text(`${translations[currentLanguage].color}:`, 20, 85);
        doc.text(`${translations[currentLanguage].salePrice}:`, 20, 95);
        doc.text(`${translations[currentLanguage].chassisNumber}:`, 20, 105);
        doc.text(`${translations[currentLanguage].saleDate}:`, 20, 115);

        doc.setFont("Helvetica", "normal");
        doc.text(`${buyerName}`, 80, 45);
        doc.text(`${sellerName}`, 80, 55);
        doc.text(`${brandd}`, 80, 65);
        doc.text(`${modell}`, 80, 75);
        doc.text(`${color}`, 80, 85);
        doc.text(`$${salePrice}`, 80, 95);
        doc.text(`${chassisNumber}`, 80, 105);
        doc.text(`${saleDate}`, 80, 115);

        const separatorY = doc.internal.pageSize.height / 2.5;
        doc.setDrawColor(0, 0, 0);
        doc.line(10, separatorY, 200, separatorY);

     

        doc.setFontSize(14);
        doc.text(translations[currentLanguage].footer, 8, 124);

        // Si se cargó un archivo de imagen, procesarlo
        if (saleActFile) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const imgData = e.target.result;
                doc.addImage(imgData, 'JPEG', 10, 134, 175, 160); // Ajusta la posición y tamaño según tus necesidades
                doc.save('factura.pdf');
                clearForm('invoiceForm');
            };
            reader.readAsDataURL(saleActFile);
        } else {
            doc.save('factura.pdf');
            clearForm('invoiceForm');
        }
    };
}

let currentLanguage = 'es'; // Idioma por defecto
const translations = {
    es: {
        companyName: "The Compas Auto Import",
        slogan: "¡The Best Option!",
        title: "FACTURA",
        buyerName: "Nombre del Comprador",
        sellerName: "Nombre del Vendedor",
        brand: "Marca",
        model: "Modelo",
        color: "Color",
        salePrice: "Precio de Venta",
        chassisNumber: "VIN del Auto",
        saleDate: "Fecha de Venta",
        footer: "¡Gracias por su compra!"
    },
    en: {
        companyName: "The Compas Auto Import",
        slogan: "¡The Best Option!",
        title: "INVOICE",
        buyerName: "Buyer's Name",
        sellerName: "Seller's Name",
        brand: "Brand",
        model: "Model",
        color: "Color",
        salePrice: "Sale Price",
        chassisNumber: "Car VIN",
        saleDate: "Sale Date",
        footer: "¡Thank you for your purchase!"
    }
};

function changeLanguage() {
    const languageSelector = document.getElementById('languageSelector');
    currentLanguage = languageSelector.value;
    updatePlaceholders();
}
function updatePlaceholders() {
    const placeholders = {
        es: {
            buyerName: "Nombre del Comprador",
            sellerName: "Nombre del Vendedor",
            brandd: "Marca",
            modell: "Modelo",
            color: "Color",
            salePrice: "Precio de Venta",
            chassisNumber: "Número de Chasis",
            saleDate: "Fecha de Venta",
            saleActFile: "Acto de Venta:"
        },
        en: {
            buyerName: "Buyer's Name",
            sellerName: "Seller's Name",
            brandd: "Brand",
            modell: "Model",
            color: "Color",
            salePrice: "Sale Price",
            chassisNumber: "Car VIN",
            saleDate: "Sale Date",
            saleActFile: "Sale Act:"
        }
    };

    const lang = placeholders[currentLanguage];
    document.getElementById('buyerName').placeholder = lang.buyerName;
    document.getElementById('sellerName').placeholder = lang.sellerName;
    document.getElementById('brandd').placeholder = lang.brandd;
    document.getElementById('modell').placeholder = lang.modell;
    document.getElementById('color').placeholder = lang.color;
    document.getElementById('salePriceInvoice').placeholder = lang.salePrice;
    document.getElementById('chassisNumber').placeholder = lang.chassisNumber;
    document.getElementById('saleDate').placeholder = lang.saleDate;
    document.getElementById('saleActFile').previousElementSibling.innerText = lang.saleActFile;
}

// Llama a esta función en la carga del modal para establecer los placeholders
function openInvoiceModal() {
    updatePlaceholders(); // Asegúrate de que los placeholders se configuren correctamente al abrir el modal
    // Mostrar el modal aquí
}


// Función para cerrar el modal de "Detalles de la Factura"
function closeDetailsModal() {
    document.getElementById('detailsInvoiceModal').style.display = 'none';
}


function generateInvoice() {
    document.getElementById('invoiceModal').style.display = 'block';
}

function closeInvoiceModal() {
    document.getElementById('invoiceModal').style.display = 'none';
}

// Funciones para abrir y cerrar modales
function openModal() {
    document.getElementById('carModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('carModal').style.display = 'none';
}

function openSoldCarsModal() {
    document.getElementById('soldCarsModal').style.display = 'block';
}

function closeSoldCarsModal() {
    document.getElementById('soldCarsModal').style.display = 'none';
}

// Función para mostrar el mensaje de error en un modal
function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorModal').style.display = 'block';
}

// Función para cerrar el modal de error
function closeErrorModal() {
    document.getElementById('errorModal').style.display = 'none';
}

// Inicialización
updateCarTable();
