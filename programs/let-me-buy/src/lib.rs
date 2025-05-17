use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};
use borsh::{BorshDeserialize, BorshSerialize};


declare_id!("BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya");

const SOL_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111111");

#[event]
pub struct PurchaseMade {
    pub buyer: Pubkey,
    pub product_name: String,
    pub price: u64,
    pub timestamp: i64,
    pub table_number: u8,
    pub receipt_id: u64,
    pub telegram_channel_id: String,
    pub store_name: String,
    pub receipts_account: Pubkey,
}

#[error_code]
pub enum StoreErrorCode {
    #[msg("InvalidTreasury")]
    InvalidTreasury,
    #[msg("ProductAlreadyExists")]
    ProductAlreadyExists,
    #[msg("ProductNotFound")]
    ProductNotFound,
    #[msg("InvalidMint")]
    InvalidMint,
    #[msg("InvalidAuthority")]
    InvalidAuthority,
    #[msg("StoreNotEmpty")]
    StoreNotEmpty,
    #[msg("ProductNameEmpty")]
    ProductNameEmpty,
    #[msg("StringTooLong")]
    StringTooLong,
    #[msg("VectorLimitReached")]
    VectorLimitReached,
    #[msg("InvalidStoreName")]
    InvalidStoreName,
}

fn validate_store_name(name: &str) -> Result<()> {
    // Check if name contains only lowercase letters, numbers, and hyphens
    if !name
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
    {
        return Err(StoreErrorCode::InvalidStoreName.into());
    }
    // Don't allow names that start or end with a hyphen
    if name.starts_with('-') || name.ends_with('-') {
        return Err(StoreErrorCode::InvalidStoreName.into());
    }
    // Don't allow consecutive hyphens
    if name.contains("--") {
        return Err(StoreErrorCode::InvalidStoreName.into());
    }
    Ok(())
}

#[program]
pub mod let_me_buy {
    use anchor_lang::solana_program::{program::invoke, system_instruction};

    use super::*;

    pub fn initialize(ctx: Context<Initialize>, store_name: String) -> Result<()> {
        // Validate store name length
        require!(store_name.len() <= 32, StoreErrorCode::StringTooLong);

        // Validate store name characters
        validate_store_name(&store_name)?;

        ctx.accounts.receipts.store_name = store_name.clone();
        ctx.accounts.receipts.authority = *ctx.accounts.authority.key;
        ctx.accounts.receipts.telegram_channel_id = String::new(); // Initialize as empty
        Ok(())
    }

    pub fn update_telegram_channel(
        ctx: Context<UpdateTelegramChannel>,
        store_name: String,
        telegram_channel_id: String,
    ) -> Result<()> {
        // Verify the caller is the authority
        require!(
            *ctx.accounts.authority.key == ctx.accounts.receipts.authority,
            StoreErrorCode::InvalidAuthority
        );

        // Validate telegram channel ID length
        require!(
            telegram_channel_id.len() <= 32,
            StoreErrorCode::StringTooLong
        );

        ctx.accounts.receipts.telegram_channel_id = telegram_channel_id;
        Ok(())
    }

    pub fn update_details(
        ctx: Context<UpdateDetails>,
        store_name: String,
        details: String,
    ) -> Result<()> {
        // Verify the caller is the authority
        require!(
            *ctx.accounts.authority.key == ctx.accounts.receipts.authority,
            StoreErrorCode::InvalidAuthority
        );

        // Validate details length
        require!(details.len() <= 128, StoreErrorCode::StringTooLong);

        ctx.accounts.receipts.details = details;
        Ok(())
    }

    pub fn add_product(
        ctx: Context<AddProduct>,
        store_name: String,
        name: String,
        price: u64,
    ) -> Result<()> {
        // Verify the caller is the authority
        require!(
            *ctx.accounts.authority.key == ctx.accounts.receipts.authority,
            StoreErrorCode::InvalidAuthority
        );

        // Check if product name is empty
        require!(!name.trim().is_empty(), StoreErrorCode::ProductNameEmpty);

        // Validate product name length
        require!(name.len() <= 32, StoreErrorCode::StringTooLong);

        // Check if product with same name already exists
        for product in &ctx.accounts.receipts.products {
            if product.name == name {
                return Err(StoreErrorCode::ProductAlreadyExists.into());
            }
        }

        // Check if products vector limit is reached
        require!(
            ctx.accounts.receipts.products.len() < 20,
            StoreErrorCode::VectorLimitReached
        );

        // Add new product
        ctx.accounts.receipts.products.push(Products {
            name,
            price,
            decimals: ctx.accounts.mint.decimals,
            mint: ctx.accounts.mint.key(),
        });

        Ok(())
    }

    pub fn make_purchase(
        ctx: Context<MakePurchase>,
        store_name: String,
        product_name: String,
        table_number: u8,
    ) -> Result<()> {
        // Find the product and verify the mint matches
        let product = ctx
            .accounts
            .receipts
            .products
            .iter()
            .find(|p| p.name == product_name)
            .ok_or(StoreErrorCode::ProductNotFound)?;

        require!(
            product.mint == ctx.accounts.mint.key(),
            StoreErrorCode::InvalidMint
        );

        let price = product.price;
        let decimals = product.decimals;
        let name = product.name.clone();
        let is_sol = product.mint == SOL_MINT;

        // Add a new receipt to the receipts account.
        let receipt_id = ctx.accounts.receipts.total_purchases;
        let new_receipt = Receipt {
            buyer: *ctx.accounts.signer.key,
            was_delivered: false,
            price,
            timestamp: Clock::get()?.unix_timestamp,
            receipt_id,
            table_number,
            product_name: name.clone(),
        };

        // If we've reached the limit, remove the oldest receipt first
        if ctx.accounts.receipts.receipts.len() >= 20 {
            ctx.accounts.receipts.receipts.remove(0);
        }

        // Add the new receipt
        ctx.accounts.receipts.receipts.push(new_receipt);

        // Increment the total purchases.
        ctx.accounts.receipts.total_purchases = ctx
            .accounts
            .receipts
            .total_purchases
            .checked_add(1)
            .unwrap();

        // If mint is SOL, use system program transfer
        if is_sol {
            let cpi_context = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.signer.to_account_info().clone(),
                    to: ctx.accounts.authority.to_account_info().clone(),
                },
            );
            system_program::transfer(cpi_context, price)?;
        } else {
            // Otherwise use token transfer
            let cpi_accounts = TransferChecked {
                mint: ctx.accounts.mint.to_account_info(),
                from: ctx.accounts.sender_token_account.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.signer.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

            token::transfer_checked(cpi_context, price, decimals)?;
        }

        // Emit the purchase event
        emit!(PurchaseMade {
            buyer: *ctx.accounts.signer.key,
            product_name: name,
            price,
            timestamp: Clock::get()?.unix_timestamp,
            table_number,
            receipt_id,
            telegram_channel_id: ctx.accounts.receipts.telegram_channel_id.clone(),
            store_name: ctx.accounts.receipts.store_name.clone(),
            receipts_account: ctx.accounts.receipts.key(),
        });

        Ok(())
    }

    pub fn mark_as_delivered(
        ctx: Context<MarkAsDelivered>,
        _store_name: String,
        receipt_id: u64,
    ) -> Result<()> {
        msg!("Marked purchase as delivered");
        for i in 0..ctx.accounts.receipts.receipts.len() {
            msg!("Marked purchase as delivered  {}", i);
            if ctx.accounts.receipts.receipts[i].receipt_id == receipt_id {
                msg!("Marked purchase as delivered {} {} ", receipt_id, i);
                ctx.accounts.receipts.receipts[i].was_delivered = true;
            }
        }
        Ok(())
    }

    pub fn delete_product(
        ctx: Context<DeleteProduct>,
        store_name: String,
        product_name: String,
    ) -> Result<()> {
        // Verify the caller is the authority
        require!(
            *ctx.accounts.authority.key == ctx.accounts.receipts.authority,
            StoreErrorCode::InvalidAuthority
        );

        // Find and remove the product
        let index = ctx
            .accounts
            .receipts
            .products
            .iter()
            .position(|p| p.name == product_name)
            .ok_or(StoreErrorCode::ProductNotFound)?;

        ctx.accounts.receipts.products.remove(index);

        Ok(())
    }

    pub fn delete_store(ctx: Context<DeleteStore>, store_name: String) -> Result<()> {
        // Verify the caller is the authority
        require!(
            *ctx.accounts.authority.key == ctx.accounts.receipts.authority,
            StoreErrorCode::InvalidAuthority
        );

        // Close the account and send rent to authority
        let authority = ctx.accounts.authority.to_account_info();
        let receipts = ctx.accounts.receipts.to_account_info();
        let dest_starting_lamports = authority.lamports();
        **authority.lamports.borrow_mut() = dest_starting_lamports
            .checked_add(receipts.lamports())
            .unwrap();
        **receipts.lamports.borrow_mut() = 0;

        Ok(())
    }

    pub fn realloc_store(ctx: Context<ReallocStore>, store_name: String) -> Result<()> {
        // Verify authority
        require!(
            ctx.accounts.receipts.owner == ctx.program_id,
            StoreErrorCode::InvalidAuthority
        );

        let new_size = 8 + Receipts::INIT_SPACE + 1000;

        // Calculate the new account size
        // let new_size = 8 + // discriminator
        //     (std::mem::size_of::<Receipt>() * 20) + // receipts array
        //     4 + // receipts_count
        //     8 + // total_purchases
        //     4 + 32 + // store_name
        //     32 + // authority
        //     (std::mem::size_of::<Products>() * 20) + // products array
        //     4 + // products_count
        //     4 + 32 + // telegram_channel_id
        //     1 + // bump
        //     4 + 128; // details

        let receipts_info = &ctx.accounts.receipts;
        let payer = &ctx.accounts.authority;
        let system_program = &ctx.accounts.system_program;

        // Calculate required lamports for the new size
        let rent = Rent::get()?;
        let new_minimum_balance = rent.minimum_balance(new_size);
        let lamports_diff = new_minimum_balance.saturating_sub(receipts_info.lamports());

        // Transfer additional lamports if needed
        if lamports_diff > 0 {
            invoke(
                &system_instruction::transfer(payer.key, receipts_info.key, lamports_diff),
                &[
                    payer.to_account_info(),
                    receipts_info.to_account_info(),
                    system_program.to_account_info(),
                ],
            )?;
        }

        // Reallocate the account without zeroing
        receipts_info.realloc(new_size, false)?;

        msg!(
            "Successfully reallocated store account to new size: {}",
            new_size
        );
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Receipts {
    #[max_len(20)]
    pub receipts: Vec<Receipt>,
    pub total_purchases: u64,
    #[max_len(32)]
    pub store_name: String,
    pub authority: Pubkey,
    #[max_len(20)]
    pub products: Vec<Products>,
    #[max_len(32)]
    pub telegram_channel_id: String,
    pub bump: u8,
    #[max_len(128)]
    pub details: String,
}

#[derive(Accounts)]
#[instruction(store_name: String)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Receipts::INIT_SPACE,
        seeds = [b"receipts", store_name.as_bytes()],
        bump,
        constraint = store_name.len() <= 32 @ StoreErrorCode::StringTooLong
    )]
    pub receipts: Box<Account<'info, Receipts>>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(store_name: String, telegram_channel_id: String)]
pub struct UpdateTelegramChannel<'info> {
    #[account(
        mut,
        seeds = [b"receipts", store_name.as_bytes()],
        bump
    )]
    pub receipts: Box<Account<'info, Receipts>>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(store_name: String, details: String)]
pub struct UpdateDetails<'info> {
    #[account(
        mut,
        seeds = [b"receipts", store_name.as_bytes()],
        bump
    )]
    pub receipts: Box<Account<'info, Receipts>>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(store_name: String, name: String, price: u64)]
pub struct AddProduct<'info> {
    #[account(
        mut,
        seeds = [b"receipts", store_name.as_bytes()],
        bump,
        realloc = 8 + Receipts::INIT_SPACE,
        realloc::payer = authority,
        realloc::zero = true
    )]
    pub receipts: Box<Account<'info, Receipts>>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(store_name: String, product_name: String, table_number: u8)]
pub struct MakePurchase<'info> {
    #[account(
        mut,
        seeds = [b"receipts", store_name.as_bytes()],
        bump
    )]
    pub receipts: Box<Account<'info, Receipts>>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub authority: SystemAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub sender_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = authority,
        associated_token::token_program = token_program,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
#[instruction(store_name: String, receipt_id: u64)]
pub struct MarkAsDelivered<'info> {
    #[account(
        mut,
        seeds = [b"receipts", store_name.as_bytes()],
        bump
    )]
    pub receipts: Box<Account<'info, Receipts>>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(store_name: String, product_name: String)]
pub struct DeleteProduct<'info> {
    #[account(
        mut,
        seeds = [b"receipts", store_name.as_bytes()],
        bump,
        realloc = 8 + Receipts::INIT_SPACE,
        realloc::payer = authority,
        realloc::zero = false
    )]
    pub receipts: Box<Account<'info, Receipts>>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(store_name: String)]
pub struct DeleteStore<'info> {
    #[account(
        mut,
        seeds = [b"receipts", store_name.as_bytes()],
        bump,
        close = authority
    )]
    pub receipts: Box<Account<'info, Receipts>>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(store_name: String)]
pub struct ReallocStore<'info> {
    /// CHECK: Account is a PDA that we verify in the instruction
    #[account(
        mut,
        seeds = [b"receipts", store_name.as_bytes()],
        bump,
    )]
    pub receipts: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, InitSpace)]
pub struct Products {
    pub price: u64,
    pub decimals: u8,
    pub mint: Pubkey,
    #[max_len(32)]
    pub name: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, InitSpace)]
pub struct Receipt {
    pub receipt_id: u64,
    pub buyer: Pubkey,
    pub was_delivered: bool,
    pub price: u64,
    pub timestamp: i64,
    pub table_number: u8,
    #[max_len(32)]
    pub product_name: String,
}
