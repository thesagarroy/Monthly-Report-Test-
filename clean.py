import json

with open('data.json', 'r') as f:
    data = json.load(f)

for row in data:
    cat = row['category'].strip()
    name = row['name'].strip()

    # Normalize category strings
    cat_lower = cat.lower()

    # 1. Names fixes
    if name.lower() == 'barch cord' or name.lower() == 'barch code':
        row['name'] = 'Batch Code'
    if name.lower() == 'gari vara':
        row['name'] = 'Car Vara'
    if name.lower() == 'post office ':
        row['name'] = 'Post Office'
    if name.lower() == 'car oill':
        row['name'] = 'Car Oil'
    
    # 2. Category fixes
    if 'emi' in cat_lower:
        cat = 'EMI'
    elif 'construction' in cat_lower:
        cat = 'Construction'
    elif 'saving' in cat_lower or 'seving' in cat_lower:
        cat = 'Savings'
    elif 'creditor' in cat_lower:
        cat = 'Creditor Payment'
    elif 'factory' in cat_lower:
        cat = 'Factory Expenses'
    elif 'delivery' in cat_lower:
        if name.lower() == 'car vara' or name.lower() == 'gari vara':
            cat = 'Car Fare'
        else:
            cat = 'Other Expenses'
    elif cat_lower == 'commission':
        cat = 'Commission'
    elif cat.lower() == 'payment':
        # Let's see if name implies something else
        if 'oil' in name.lower() or 'coil' in name.lower():
            pass # Keep as payment for now, or maybe Transport? Leave as "Payment"
        cat = 'Payment'
        
    row['category'] = cat

with open('data.json', 'w') as f:
    json.dump(data, f, indent=2)

with open('data.js', 'w') as f:
    f.write('const expenseData = ' + json.dumps(data) + ';\n')

print("Data cleaning completed.")
