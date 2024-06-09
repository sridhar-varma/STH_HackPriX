const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

// Setup middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trail',
  password: 'sridhar@04',
  port: 5000,
});

// Session middleware
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());



app.get('/', (req, res) => {
  res.render("home");
});

app.get('/login', (req, res) => {
    res.render('logIN');
  });
  
  app.get('/signup', (req, res) => {
    res.render('signup');
  });

  // Route to handle sign up form submission
app.post('/signupSubmit', async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
  
      // Insert into the appropriate table based on userType
      let tableName;
      if (role === 'farmer') {
        tableName = 'farmer';
      } else if (role === 'dealer') {
        tableName = 'dealer';
      } else {
        return res.status(400).send('Invalid user type');
      }
  
      const client = await pool.connect();
      const query = `
        INSERT INTO ${tableName} (name, email, password)
        VALUES ($1, $2, $3)
      `;
      client.query(query, [name, email, password]);
      
  
      
      res.render('/logIN');
    } catch (error) {
      console.error('Error during sign up:', error);
      res.status(500).send('An error occurred during sign up');
    }
  });

  app.get('/farmerProfileSet', (req, res) => {
    const farmerId = req.query.farmer_id; // Assuming farmerId is sent as a query parameter
  
    // Fetch email from farmers table based on farmerId
    pool.query('SELECT email FROM farmer WHERE id = $1', [farmerId], (error, result) => {
      if (error) {
        console.error('Error executing query', error);
        return res.status(500).send('Error fetching email');
      }
      
      // Check if any rows are returned
      if (result.rows.length === 0) {
        return res.status(404).send('Farmer not found');
      }

      // Assuming the result contains a single row with 'email' column
      const email = result.rows[0].email;
  
      // Render the 'profile2' view and pass farmerId and email
      res.render('profile2', { farmerId: farmerId, email: email });
    });
});

app.post('/newProfileSubmit', (req, res) => {
    const { name, email, phone, address } = req.body;

    // Update farmer's information in the database based on the email ID
    const query = `
        UPDATE farmer
        SET name = $1, phone_number = $2, address = $3
        WHERE email = $4
    `;
    const values = [name, phone, address, email];

    pool.query(query, values, (error, result) => {
        if (error) {
            console.error('Error executing query', error);
            return res.status(500).send('Error updating farmer profile');
        }

        res.redirect('login');
    });
});

app.get('/dealerProfileSet', (req, res) => {
    const farmerId = req.query.dealer_id; // Assuming farmerId is sent as a query parameter
  
    // Fetch email from farmers table based on farmerId
    pool.query('SELECT email FROM dealer WHERE id = $1', [farmerId], (error, result) => {
      if (error) {
        console.error('Error executing query', error);
        return res.status(500).send('Error fetching email');
      }
      
      // Check if any rows are returned
      if (result.rows.length === 0) {
        return res.status(404).send('Farmer not found');
      }

      // Assuming the result contains a single row with 'email' column
      const email = result.rows[0].email;
  
      // Render the 'profile2' view and pass farmerId and email
      res.render('profile', { dealerID: farmerId, email: email });
    });
});

app.post('/newProfileSubmitD', (req, res) => {
    const { name, email, phone, address } = req.body;

    // Update farmer's information in the database based on the email ID
    const query = `
        UPDATE dealer
        SET name = $1, phone_number = $2, address = $3
        WHERE email = $4
    `;
    const values = [name, phone, address, email];

    pool.query(query, values, (error, result) => {
        if (error) {
            console.error('Error executing query', error);
            return res.status(500).send('Error updating farmer profile');
        }

        res.redirect('login');
    });
});


  

  app.post('/loginSubmit', (req, res) => {
    const { role, email, password } = req.body;

    // Sanitize the role to prevent SQL injection
    const allowedRoles = ['farmer', 'dealer'];
    if (!allowedRoles.includes(role)) {
        return res.status(400).send('Unexpected role');
    }

    // Construct the query string to fetch user data
    const userQuery = `SELECT * FROM ${role} WHERE email = $1 AND password = $2`;
    const userValues = [email, password];

    pool.query(userQuery, userValues, (userErr, userResult) => {
        if (userErr) {
            console.error('Error executing user query', userErr);
            return res.status(500).send('Internal server error');
        }

        if (userResult.rows.length > 0) {
            // User authenticated
            const user = userResult.rows[0];
            console.log('Authenticated user:', user); // Log authenticated user

            // Construct the query string to fetch intend data for the dealer
            if (role === 'dealer') {
                const intendQuery = `SELECT * FROM intend WHERE dealer_id = $1`;
                const intendValues = [user.id]; // Assuming 'id' is the unique identifier for the dealer

                pool.query(intendQuery, intendValues, (intendErr, intendResult) => {
                    if (intendErr) {
                        console.error('Error executing intend query', intendErr);
                        return res.status(500).send('Internal server error');
                    }

                    const intendData = intendResult.rows; // Array of intend data for the dealer

                    // Render the appropriate template with the fetched data
                    res.render('dealer', {
                        message: 'Login successful',
                        role: role,
                        user: user,
                        intends: intendData
                    });
                });
            } else {
                const intendQuery = `SELECT * FROM request WHERE farmer_id = $1`;
                const intendValues = [user.id]; // Assuming 'id' is the unique identifier for the dealer

                pool.query(intendQuery, intendValues, (intendErr, intendResult) => {
                    if (intendErr) {
                        console.error('Error executing intend query', intendErr);
                        return res.status(500).send('Internal server error');
                    }

                    const intendData = intendResult.rows; // Array of intend data for the dealer

                    // Render the appropriate template with the fetched data
                    res.render('farmer', {
                        message: 'Login successful',
                        role: role,
                        user: user,
                        intends: intendData
                    });
                });
            }
        } else {
            // Authentication failed
            console.error("error");
            return res.status(401).json({ message: 'Invalid credentials' });
        }
    });
});

app.post('/createOrder', (req, res) => {
    // Get the dealer_id from the request body
    const dealerId = req.body.dealer_id;

    // Query the database to fetch dealer information
    const dealerQuery = `SELECT * FROM dealer WHERE id = $1`;
    const dealerValues = [dealerId];

    pool.query(dealerQuery, dealerValues, (dealerErr, dealerResult) => {
        if (dealerErr) {
            console.error('Error fetching dealer information', dealerErr);
            return res.status(500).send('Internal server error');
        }

        if (dealerResult.rows.length > 0) {
            // Dealer information fetched successfully
            const dealerInfo = dealerResult.rows[0];
            console.log('Dealer information:', dealerInfo);

            // Render the 'create.ejs' template and pass dealerInfo to it
            res.render('create', {
                dealerInfo: dealerInfo,
                message: 'Order created successfully' // Example message
            });

            

            
        } else {
            console.error('Dealer not found');
            return res.status(404).send('Dealer not found');
        }
    });
});

app.get('/NewRouteD/:dealerId', (req, res) => {
    const dealerId = req.params.dealerId;
    const userQuery = `SELECT * FROM dealer WHERE id=$1`;
    const userValues = [dealer_id];

    pool.query(userQuery, userValues, (userErr, userResult) => {
        if (userErr) {
            console.error('Error executing user query', userErr);
            return res.status(500).send('Internal server error');
        }

        if (userResult.rows.length > 0) {
            // User authenticated
            const user = userResult.rows[0];
            console.log('Authenticated user:', user); // Log authenticated user

            // Construct the query string to fetch intend data for the dealer
            
                const intendQuery = `SELECT * FROM intend WHERE dealer_id = $1`;
                const intendValues = [user.id]; // Assuming 'id' is the unique identifier for the dealer

                pool.query(intendQuery, intendValues, (intendErr, intendResult) => {
                    if (intendErr) {
                        console.error('Error executing intend query', intendErr);
                        return res.status(500).send('Internal server error');
                    }

                    const intendData = intendResult.rows; // Array of intend data for the dealer

                    // Render the appropriate template with the fetched data
                    res.render('dealer', {
                        message: 'Login successful',
                        role: role,
                        user: user,
                        intends: intendData
                    });
                });
            }
        
    });
    
});



app.post('/sellOrder', (req, res) => {
    // Get the dealer_id from the request body
    const dealerId = req.body.farmer_id;

    // Query the database to fetch dealer information
    const dealerQuery = `SELECT * FROM farmer WHERE id = $1`;
    const dealerValues = [dealerId];

    pool.query(dealerQuery, dealerValues, (dealerErr, dealerResult) => {
        if (dealerErr) {
            console.error('Error fetching dealer information', dealerErr);
            return res.status(500).send('Internal server error');
        }

        if (dealerResult.rows.length > 0) {
            // Dealer information fetched successfully
            const dealerInfo = dealerResult.rows[0];
            console.log('Dealer information:', dealerInfo);

            // Render the 'create.ejs' template and pass dealerInfo to it
            res.render('place', {
                sellInfo: dealerInfo,
                message: 'Order created successfully' // Example message
            });
        } else {
            console.error('Dealer not found');
            return res.status(404).send('Dealer not found');
        }
    });
});

// Route to handle form submission
app.post('/createOrder2', (req, res) => {
    // Extract data from the request body
    const { dealer_id, category, subcategory, amount, address, state, deadline } = req.body;

    // Insert the data into the 'intend' table
    const query = `INSERT INTO intend (dealer_id,status , category, subcategory, amount, address, state, deadline) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
    const values = [dealer_id, "pending", category, subcategory, amount, address, state, deadline];

    pool.query(query, values, (err, result) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        console.log('Data inserted successfully:', result.rows);
       res.render('login');
        res.status(200).json({ message: 'Order created successfully' });
    });
});

app.post('/confirmIntend', (req, res) => {
    const { intent_id } = req.body;
console.error("hai");
    const query = `SELECT * FROM request WHERE intend_id=$1`;
    const values = [intent_id];
    console.error("hai");
  
    // Perform database operations to confirm the intention and retrieve data
    pool.query(query, values)
        .then(data => {
            // Render the list.ejs template and pass the data to it
            res.render('list', { data: data.rows });
            
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            res.status(500).send('Internal Server Error');
        });
});

app.get('/confirmIntend2', (req, res) => {
    const intent_id = req.query.intent_id; // Get intent_id from query parameters
    
    const query = `SELECT * FROM request WHERE intend_id=$1`;
    const values = [intent_id];
  
    // Perform database operations to confirm the intention and retrieve data
    pool.query(query, values)
        .then(data => {
            // Render the list.ejs template and pass the data to it
            res.render('list', { data: data.rows });
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            res.status(500).send('Internal Server Error');
        });
});


app.post('/approval', (req, res) => {
    const { request_id} = req.body;

    
    const query = `SELECT * FROM request WHERE request_id=$1`;
    const values = [request_id];

    pool.query(query, values)
        .then(datas => {
            // Render the list.ejs template and pass the data to it

            
            res.render('approve', { data: datas.rows[0] });
            
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            res.status(500).send('Internal Server Error');
        });


    
    
});

app.post('/approveOrReject', async(req, res) => {
    const { request_id, intend_id, action } = req.body;

    let status;
    if (action === 'approve') {
        status = 'approved';
    } else if (action === 'reject') {
        status = 'rejected';
    } else {
        return res.status(400).send('Invalid action');
    }

    try {
        

        // Update the request table
        const updateRequestQuery = `UPDATE request SET status = $1 WHERE request_id = $2`;
        const updateRequestValues = [status, request_id];
        await pool.query(updateRequestQuery, updateRequestValues);

        // Fetch the farmers_offered_amount
        const fetchRequestQuery = `SELECT quantity_offered, intend_id FROM request WHERE request_id = $1`;
        const fetchRequestValues = [request_id];
        const requestResult = await pool.query(fetchRequestQuery, fetchRequestValues);
        const { quantity_offered, intend_id } = requestResult.rows[0];

        // Update the intend table
        const updateIntendQuery = `UPDATE intend SET amount = amount - $1 WHERE intend.intent_id = $2`;
        const updateIntendValues = [quantity_offered, intend_id];
        await pool.query(updateIntendQuery, updateIntendValues);

       
        res.render('logIN');

        
    } catch (error) {
        
        console.error('Error processing transaction:', error);
        res.status(500).send('Internal Server Error');
    } finally {

       

       
        
    }
});

app.post('/checkDealers', (req, res) => {
    const { farmer_id, category, subcategory, amount, address, state, deadline } = req.body;
console.error("hai");
console.error(category,subcategory);
    const query = `SELECT * FROM intend WHERE category=$1 AND subcategory=$2`;
    const values = [category, subcategory];
    console.error("hai");
    console.error("zzzzzzzzzzzzzzzzzzzzzzz:",farmer_id);
  
    // Perform database operations to confirm the intention and retrieve data
    pool.query(query, values)
        .then(data => {
            console.error(data.rows[0]);
            // Render the list.ejs template and pass the data to it
            res.render('dealershow', { data: data.rows, farmer_id });
            
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            res.status(500).send('Internal Server Error');
        });
});

app.post('/requestplace', (req, res) => {
    const { intent_id,farmer_id} = req.body;

    
    const query = `SELECT * FROM intend WHERE intent_id=$1`;
    const values = [intent_id];
    console.error("nnnnnnnnnnnnnnnn:",farmer_id);
    pool.query(query, values)
        .then(datas => {
            // Render the list.ejs template and pass the data to it

            
            res.render('requestplace', { data: datas.rows[0],farmer_id });
            
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            res.status(500).send('Internal Server Error');
        });


    
    
});

app.get('/home', (req,res) => {
    res.render('home');3
});

// Route to handle form submission
app.post('/submitplace', (req, res) => {
    // Extract data from the request body
    const { intent_id,farmer_id, dealer_id, quantity_offered } = req.body;

    // Insert the data into the 'intend' table
    const query = `INSERT INTO request (intend_id, status , farmer_id, dealer_id, quantity_offered) VALUES ($1, $2, $3, $4, $5)`;
    const values = [intent_id, "pending", farmer_id, dealer_id, quantity_offered];

    pool.query(query, values, (err, result) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        console.log('Data inserted successfully:', result.rows);
        
        res.render('login');
    });
});








app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});